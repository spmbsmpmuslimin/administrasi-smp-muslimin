import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Shield, BookOpen, School, Calendar, History, ChevronDown, ChevronUp, Award, TrendingUp, Clock, GraduationCap, Target, Users, BarChart3, Search, Eye } from 'lucide-react';

const ProfileTab = ({ userId, user, showToast, loading, setLoading }) => {
  const [profileData, setProfileData] = useState(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [targetUserId, setTargetUserId] = useState(userId);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  const isInitialLoad = useRef(true);

  const fetchActiveAcademicYear = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('year')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active academic year:', error);
        return null;
      }

      return data?.year || null;
    } catch (err) {
      console.error('Error in fetchActiveAcademicYear:', err);
      return null;
    }
  }, []);

  const searchUsers = useCallback(async (query) => {
    try {
      setSearching(true);
      
      let queryBuilder = supabase
        .from('users')
        .select('id, username, full_name, role, teacher_id, is_active')
        .order('created_at', { ascending: false });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(
          `full_name.ilike.%${query}%,username.ilike.%${query}%,teacher_id.ilike.%${query}%`
        );
      }

      queryBuilder = queryBuilder.limit(50);

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error searching users:', error);
        showToast('Gagal memuat daftar pengguna', 'error');
        return;
      }

      setUserSearchResults(data || []);
    } catch (err) {
      console.error('Error in searchUsers:', err);
      showToast('Terjadi kesalahan saat memuat pengguna', 'error');
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  const loadUserProfile = useCallback(async (uid) => {
    try {
      console.log('Loading profile for user:', uid);
      setLoading(true);
      
      if (!uid) {
        console.error('User ID is missing');
        showToast('ID pengguna tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      const activeYear = await fetchActiveAcademicYear();
      setActiveAcademicYear(activeYear);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, role, teacher_id, homeroom_class_id, is_active, created_at')
        .eq('id', uid)
        .maybeSingle();

      if (userError) {
        console.error('Error loading user profile:', userError);
        const errorMsg = userError.code === 'PGRST116' 
          ? 'Pengguna tidak ditemukan'
          : `Gagal memuat profil: ${userError.message}`;
        showToast(errorMsg, 'error');
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

      // Load homeroom class hanya untuk guru - DIPERBAIKI
      if (userData.homeroom_class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, grade, academic_year, is_active')
          .eq('id', userData.homeroom_class_id)
          .maybeSingle();

        if (classError) {
          console.error('Error loading homeroom class:', classError);
        } else if (classData) {
          console.log('Homeroom class loaded:', classData);
          setProfileData(prev => ({
            ...prev,
            homeroom_class: classData
          }));
        } else {
          console.log('No homeroom class found for ID:', userData.homeroom_class_id);
        }
      }

      // Load teaching assignments hanya untuk guru
      if (userData.teacher_id && activeYear) {
        await loadTeachingAssignments(userData.teacher_id, activeYear, false);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      showToast('Terjadi kesalahan saat memuat profil', 'error');
      setLoading(false);
    }
  }, [fetchActiveAcademicYear, setLoading, showToast]);

  const loadTeachingAssignments = useCallback(async (teacherId, activeYear, includeHistory = false) => {
    try {
      if (includeHistory) {
        setLoadingHistory(true);
      }
      
      if (includeHistory) {
        const { data: allAssignments, error: assignError } = await supabase
          .from('teacher_assignments')
          .select(`
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              name,
              grade,
              is_active
            )
          `)
          .eq('teacher_id', teacherId)
          .order('academic_year', { ascending: false })
          .order('semester', { ascending: false });

        if (assignError) {
          console.error('Error loading teaching assignments:', assignError);
          setLoadingHistory(false);
          return;
        }

        if (allAssignments) {
          const filteredAssignments = allAssignments.filter(a => {
            if (a.academic_year === activeYear) {
              return a.classes !== null;
            }
            return true;
          });

          setProfileData(prev => ({
            ...prev,
            teaching_assignments: filteredAssignments
          }));
        }
      } else {
        const { data: currentAssignments, error: assignError } = await supabase
          .from('teacher_assignments')
          .select(`
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              name,
              grade,
              is_active
            )
          `)
          .eq('teacher_id', teacherId)
          .eq('academic_year', activeYear)
          .order('semester', { ascending: false });

        if (assignError) {
          console.error('Error loading teaching assignments:', assignError);
          return;
        }

        if (currentAssignments) {
          const filteredAssignments = currentAssignments.filter(a => a.classes !== null);

          setProfileData(prev => ({
            ...prev,
            teaching_assignments: filteredAssignments
          }));
        }
      }

      setLoadingHistory(false);
    } catch (err) {
      console.error('Error loading teaching assignments:', err);
      setLoadingHistory(false);
    }
  }, []);

  // Effects tetap sama...
  useEffect(() => {
    if (targetUserId && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadUserProfile(targetUserId);
    }
  }, [targetUserId, loadUserProfile]);

  useEffect(() => {
    if (!isInitialLoad.current && targetUserId) {
      loadUserProfile(targetUserId);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (!isInitialLoad.current && profileData?.teacher_id && activeAcademicYear) {
      loadTeachingAssignments(profileData.teacher_id, activeAcademicYear, showHistory);
    }
  }, [showHistory, profileData?.teacher_id, activeAcademicYear, loadTeachingAssignments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        searchUsers('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (user?.role === 'admin' && userSearchResults.length === 0) {
      searchUsers('');
    }
  }, [user?.role, userSearchResults.length, searchUsers]);

  const handleUserSelect = (selectedUser) => {
    setTargetUserId(selectedUser.id);
    setSearchQuery('');
    setUserSearchResults([]);
    setShowHistory(false);
  };

  const isViewingOtherProfile = targetUserId !== userId;
  const isAdmin = user?.role === 'admin';

  const getClassName = (assignment) => {
    if (assignment.classes?.name) {
      return assignment.classes.name;
    }
    if (assignment.classes?.grade) {
      return `Kelas ${assignment.classes.grade}`;
    }
    return `Kelas ${assignment.class_id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <User size={56} className="text-gray-400" />
        </div>
        <p className="text-gray-500 text-xl font-semibold mb-2">Data profil tidak tersedia</p>
        <p className="text-gray-400 text-sm mb-6">Terjadi kesalahan saat memuat profil</p>
        <button 
          onClick={() => {
            isInitialLoad.current = true;
            loadUserProfile(targetUserId);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl font-medium"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const currentAssignments = profileData.teaching_assignments?.filter(
    a => a.academic_year === activeAcademicYear
  ) || [];
  
  const historyAssignments = profileData.teaching_assignments?.filter(
    a => a.academic_year !== activeAcademicYear
  ) || [];

  const totalSubjects = currentAssignments.length;
  const uniqueSubjects = [...new Set(currentAssignments.map(a => a.subject))].length;
  const totalClasses = [...new Set(currentAssignments.map(a => a.class_id))].length;
  const accountAge = Math.floor((new Date() - new Date(profileData.created_at)) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Admin User Search Bar */}
      {isAdmin && (
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Cari user berdasarkan nama, username, atau ID guru..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  )}
                </div>
                
                {userSearchResults.length > 0 && searchQuery && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {userSearchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleUserSelect(result)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{result.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {result.username} • {result.role} 
                            {result.teacher_id && ` • ${result.teacher_id}`}
                          </p>
                        </div>
                        <Eye size={16} className="text-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isViewingOtherProfile && (
                <button
                  onClick={() => setTargetUserId(userId)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg font-medium flex items-center gap-2"
                >
                  <User size={16} />
                  Lihat Profil Saya
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User List untuk Admin */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-2.5">
              <Users size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Daftar Pengguna</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            <button
              onClick={() => setTargetUserId(userId)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                !isViewingOtherProfile 
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md' 
                  : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.username}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  <Shield size={12} />
                  {user?.role}
                </span>
                {!isViewingOtherProfile && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                    Aktif
                  </span>
                )}
              </div>
            </button>

            {userSearchResults
              .filter(otherUser => otherUser.id !== userId)
              .slice(0, 8)
              .map((otherUser) => (
              <button
                key={otherUser.id}
                onClick={() => handleUserSelect(otherUser)}
                className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all bg-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    otherUser.role === 'admin' 
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                      : otherUser.role === 'teacher'
                      ? 'bg-gradient-to-br from-green-500 to-green-600'
                      : 'bg-gradient-to-br from-gray-500 to-gray-600'
                  }`}>
                    <span className="text-white font-bold text-sm">
                      {otherUser.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{otherUser.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{otherUser.username}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    otherUser.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : otherUser.role === 'teacher'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <Shield size={12} />
                    {otherUser.role}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    otherUser.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {otherUser.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {userSearchResults.length > 9 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => searchUsers('')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                Tampilkan Lebih Banyak
              </button>
            </div>
          )}

          {userSearchResults.length === 0 && (
            <div className="text-center py-8">
              <Users size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Gunakan pencarian di atas untuk menemukan pengguna</p>
            </div>
          )}
        </div>
      )}

      {/* Viewing Other Profile Banner */}
      {isViewingOtherProfile && (
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={24} />
              <div>
                <p className="font-semibold">Melihat Profil User Lain</p>
                <p className="text-blue-100 text-sm">
                  {profileData.full_name} ({profileData.role})
                </p>
              </div>
            </div>
            <button
              onClick={() => setTargetUserId(userId)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition text-sm font-medium"
            >
              Kembali ke Profil Saya
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {profileData.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${
                profileData.is_active ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{profileData.full_name}</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Mail size={16} />
                {profileData.username}
                {isViewingOtherProfile && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Melihat sebagai Admin
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
              profileData.role === 'admin' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' 
                : profileData.role === 'teacher'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
            }`}>
              <Shield size={16} />
              {profileData.role === 'admin' ? 'Administrator' : 
               profileData.role === 'teacher' ? 'Guru' : 'User'}
            </span>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium ${
              profileData.is_active 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                profileData.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></span>
              {profileData.is_active ? 'Akun Aktif' : 'Akun Nonaktif'}
            </span>
          </div>
        </div>

        {activeAcademicYear && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Calendar size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Tahun Ajaran Aktif</p>
                  <p className="text-2xl font-bold">{activeAcademicYear}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm mb-1">Bergabung Sejak</p>
                <p className="text-lg font-semibold">{accountAge} hari yang lalu</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {profileData.role === 'teacher' && profileData.teacher_id && currentAssignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-500 rounded-xl p-3">
                <BookOpen size={24} className="text-white" />
              </div>
              <TrendingUp size={20} className="text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900 mb-1">{totalSubjects}</p>
            <p className="text-sm text-orange-700 font-medium">Total Mengajar</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-500 rounded-xl p-3">
                <Target size={24} className="text-white" />
              </div>
              <Award size={20} className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900 mb-1">{uniqueSubjects}</p>
            <p className="text-sm text-purple-700 font-medium">Mata Pelajaran</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-500 rounded-xl p-3">
                <Users size={24} className="text-white" />
              </div>
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">{totalClasses}</p>
            <p className="text-sm text-blue-700 font-medium">Kelas Berbeda</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-500 rounded-xl p-3">
                <Clock size={24} className="text-white" />
              </div>
              <GraduationCap size={20} className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900 mb-1">{historyAssignments.length}</p>
            <p className="text-sm text-green-700 font-medium">Riwayat Mengajar</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2.5">
                <User size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Informasi Akun</h3>
            </div>
            
            <div className="space-y-5">
              <div className="group">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Username</p>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 group-hover:border-blue-300 transition">
                  <p className="font-semibold text-gray-900">{profileData.username}</p>
                </div>
              </div>

              {profileData.teacher_id && (
                <div className="group">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">ID Guru</p>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200 group-hover:border-blue-300 transition">
                    <p className="font-mono text-sm font-bold text-gray-900">{profileData.teacher_id}</p>
                  </div>
                </div>
              )}

              <div className="group">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Bergabung Pada</p>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 group-hover:border-blue-300 transition">
                  <p className="font-semibold text-gray-900">
                    {new Date(profileData.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{accountAge} hari yang lalu</p>
                </div>
              </div>

              {profileData.role === 'admin' && (
                <div className="group">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wide">Hak Akses</p>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200 group-hover:border-purple-300 transition">
                    <p className="font-semibold text-purple-900">Administrator Sistem</p>
                    <p className="text-xs text-purple-600 mt-1">Akses penuh ke semua fitur dan data</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Homeroom Class Card - DIPERBAIKI */}
          {profileData.role === 'teacher' && profileData.homeroom_class ? (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                  <School size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold">Wali Kelas</h3>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white rounded-xl px-6 py-4 text-center shadow-lg">
                    <p className="text-4xl font-bold text-green-600">
                      {profileData.homeroom_class.name || profileData.homeroom_class.grade}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-green-100 text-sm mb-1">Tahun Ajaran</p>
                    <p className="text-xl font-bold">{profileData.homeroom_class.academic_year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-100">
                  <Award size={16} />
                  <span>Status: {profileData.homeroom_class.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </div>
              </div>
            </div>
          ) : profileData.role === 'teacher' && profileData.homeroom_class_id ? (
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-500 rounded-xl p-2.5">
                  <School size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-yellow-900">Wali Kelas</h3>
              </div>
              <p className="text-sm text-yellow-700 leading-relaxed">
                Data kelas wali tidak ditemukan untuk ID: {profileData.homeroom_class_id}
              </p>
            </div>
          ) : null}
        </div>

        {/* Right Column - Teaching Assignments (Hanya untuk Guru) */}
        {profileData.role === 'teacher' && (
          <div className="lg:col-span-2 space-y-6">
            {/* Current Assignments */}
            {currentAssignments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Mata Pelajaran Aktif</h3>
                      <p className="text-sm text-gray-500">{totalSubjects} total mengajar</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-200">
                    <p className="text-xs text-orange-600 font-bold">{activeAcademicYear}</p>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {currentAssignments.map((assignment, index) => (
                    <div 
                      key={assignment.id || index} 
                      className="group bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-orange-600 transition">
                            {assignment.subject}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                              <Users size={14} />
                              {getClassName(assignment)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                              <Calendar size={14} />
                              Semester {assignment.semester}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                              <Award size={14} />
                              {assignment.academic_year}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toggle History Button */}
                {profileData.teacher_id && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={loadingHistory}
                    className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl transition-all shadow-sm hover:shadow-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {loadingHistory ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-gray-700"></div>
                        <span>Memuat Riwayat...</span>
                      </>
                    ) : (
                      <>
                        <History size={20} className="group-hover:rotate-12 transition-transform" />
                        <span>{showHistory ? 'Sembunyikan' : 'Tampilkan'} Riwayat Mengajar</span>
                        {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* History Assignments */}
            {showHistory && historyAssignments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-2.5">
                    <History size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Riwayat Mengajar</h3>
                    <p className="text-sm text-gray-500">{historyAssignments.length} pengalaman mengajar</p>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {historyAssignments.map((assignment, index) => (
                    <div 
                      key={assignment.id || index} 
                      className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-200 opacity-80 hover:opacity-100 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-700 text-lg mb-2">
                            {assignment.subject}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200">
                              <Users size={14} />
                              {getClassName(assignment)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-200">
                              <Calendar size={14} />
                              Semester {assignment.semester}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                              <Clock size={14} />
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

            {/* Empty State untuk Guru */}
            {currentAssignments.length === 0 && !profileData.homeroom_class && (
              <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
                <div className="bg-gray-100 rounded-full p-6 w-fit mx-auto mb-4">
                  <BookOpen size={48} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Tugas Mengajar</h3>
                <p className="text-gray-500">{(isViewingOtherProfile ? 'User ini' : 'Anda')} belum memiliki mata pelajaran yang diajarkan untuk tahun ajaran ini.</p>
              </div>
            )}
          </div>
        )}

        {/* Right Column untuk Admin */}
        {profileData.role === 'admin' && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 shadow-lg border border-purple-200 text-center">
              <div className="bg-purple-500 rounded-full p-4 w-fit mx-auto mb-4">
                <Shield size={48} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-purple-900 mb-3">Administrator System</h3>
              <p className="text-purple-700 text-lg mb-6">
                {isViewingOtherProfile 
                  ? `Anda sedang melihat profil ${profileData.full_name} sebagai Administrator`
                  : 'Anda memiliki akses penuh untuk mengelola semua data dan pengguna dalam sistem'
                }
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-white/50 rounded-xl p-4 border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-2">Hak Akses:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Kelola semua user & role</li>
                    <li>• Akses data lengkap sistem</li>
                    <li>• Konfigurasi akademik</li>
                    <li>• Monitoring aktivitas</li>
                  </ul>
                </div>
                <div className="bg-white/50 rounded-xl p-4 border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-2">Fitur Khusus:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Lihat profil semua user</li>
                    <li>• Reset password user</li>
                    <li>• Generate laporan sistem</li>
                    <li>• Backup & restore data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ProfileTab;