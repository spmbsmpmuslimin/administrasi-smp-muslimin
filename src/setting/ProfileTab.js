// ProfileTab.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Shield, BookOpen, School, Calendar } from 'lucide-react';

const ProfileTab = ({ userId, user, showToast, loading, setLoading }) => {
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (userId) {
      loadUserProfile(userId);
    }
  }, [userId]);

  const loadUserProfile = async (userId) => {
    try {
      console.log('Loading profile for user:', userId);
      setLoading(true);
      
      if (!userId) {
        console.error('User ID is missing');
        showToast('ID pengguna tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      // ✅ Query user dengan proper select
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, role, teacher_id, homeroom_class_id, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error loading user profile:', userError);
        showToast('Gagal memuat profil pengguna', 'error');
        setLoading(false);
        return;
      }

      if (!userData) {
        showToast('Data pengguna tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      console.log('User profile loaded:', userData);
      setProfileData(userData);

      // ✅ Jika user adalah wali kelas, ambil info kelas
      if (userData.homeroom_class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, grade, academic_year')
          .eq('id', userData.homeroom_class_id)
          .maybeSingle();

        if (classError) {
          console.error('Error loading homeroom class:', classError);
        } else if (classData) {
          setProfileData(prev => ({
            ...prev,
            homeroom_class: classData
          }));
        }
      }

      // ✅ Jika user adalah guru mapel, ambil mata pelajaran dengan JOIN ke classes
      if (userData.teacher_id) {
        const { data: assignments, error: assignError } = await supabase
          .from('teacher_assignments')
          .select(`
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              grade
            )
          `)
          .eq('teacher_id', userData.teacher_id)
          .order('academic_year', { ascending: false })
          .order('semester', { ascending: false });

        if (assignError) {
          console.error('Error loading teaching assignments:', assignError);
        } else if (assignments) {
          setProfileData(prev => ({
            ...prev,
            teaching_assignments: assignments
          }));
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      showToast('Terjadi kesalahan saat memuat profil', 'error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <User size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Data profil tidak tersedia</p>
        <button 
          onClick={() => loadUserProfile(userId)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <User size={24} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profil Pengguna</h2>
          <p className="text-sm text-gray-600">Informasi akun dan detail pengguna</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informasi Dasar */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Informasi Dasar
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Nama Lengkap</p>
              <p className="text-lg font-semibold text-gray-800">{profileData.full_name}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Username</p>
              <p className="font-medium text-gray-700">{profileData.username}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Role</p>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                profileData.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                <Shield size={14} />
                {profileData.role === 'admin' ? 'Administrator' : 'Guru'}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status Akun</p>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                profileData.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  profileData.is_active ? 'bg-green-600' : 'bg-red-600'
                }`}></span>
                {profileData.is_active ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>

            {profileData.teacher_id && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">ID Guru</p>
                <p className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded">
                  {profileData.teacher_id}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Informasi Tugas Mengajar */}
        <div className="space-y-6">
          {/* Wali Kelas */}
          {profileData.homeroom_class && (
            <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-6 border border-green-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <School size={18} className="text-green-600" />
                Wali Kelas
              </h3>
              <div className="flex items-center gap-3">
                <div className="bg-green-600 text-white rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl font-bold">{profileData.homeroom_class.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tahun Ajaran</p>
                  <p className="font-semibold text-gray-800">{profileData.homeroom_class.academic_year}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mata Pelajaran yang Diajar */}
          {profileData.teaching_assignments && profileData.teaching_assignments.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-6 border border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-orange-600" />
                Mata Pelajaran yang Diajar
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {profileData.teaching_assignments.map((assignment, index) => (
                  <div 
                    key={assignment.id || index} 
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 mb-1">{assignment.subject}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Kelas {assignment.classes?.grade || assignment.class_id}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Semester {assignment.semester}
                          </span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {assignment.academic_year}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Tambahan */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-gray-600" />
              Informasi Akun
            </h3>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Akun Dibuat</p>
              <p className="font-medium text-gray-700">
                {new Date(profileData.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;