import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Shield, BookOpen, School, Calendar, History, ChevronDown, ChevronUp, Award, TrendingUp, Clock, GraduationCap, Target, Users, BarChart3, Search, Eye, Edit2, Trash2, Plus, X, Save, AlertCircle } from 'lucide-react';

const ProfileTab = ({ userId, user, showToast, loading, setLoading }) => {
  const [profileData, setProfileData] = useState(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [targetUserId, setTargetUserId] = useState(userId);
  
  // User Management States
  const [showUserList, setShowUserList] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  // CRUD States
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'teacher',
    teacher_id: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
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
        .select('id, username, full_name, role, teacher_id, is_active, created_at')
        .neq('role', 'admin') // ← EXCLUDE ADMIN
        .order('teacher_id', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(
          `full_name.ilike.%${query}%,username.ilike.%${query}%,teacher_id.ilike.%${query}%`
        );
      }

      queryBuilder = queryBuilder.limit(100);

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
        }
      }

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
      
      console.log('🔍 Loading assignments for:', { teacherId, activeYear, includeHistory });
      
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
              grade,
              academic_year,
              is_active
            )
          `)
          .eq('teacher_id', teacherId)
          .order('academic_year', { ascending: false })
          .order('semester', { ascending: false });

        console.log('📊 All assignments:', allAssignments);
        console.log('❌ Error:', assignError);

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

          console.log('✅ Filtered assignments (with history):', filteredAssignments);

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
              grade,
              academic_year,
              is_active
            )
          `)
          .eq('teacher_id', teacherId)
          .eq('academic_year', activeYear)
          .order('semester', { ascending: false });

        console.log('📊 Current assignments:', currentAssignments);
        console.log('❌ Error:', assignError);

        if (assignError) {
          console.error('Error loading teaching assignments:', assignError);
          return;
        }

        if (currentAssignments) {
          const filteredAssignments = currentAssignments.filter(a => a.classes !== null);
          
          console.log('✅ Filtered current assignments:', filteredAssignments);

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

  // Auto-expand list on search
  useEffect(() => {
    if (searchQuery.trim() && !showUserList) {
      setShowUserList(true);
    }
  }, [searchQuery, showUserList]);

  // Filter users based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = userSearchResults.filter(u => 
        u.full_name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.teacher_id?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(userSearchResults);
    }
  }, [searchQuery, userSearchResults]);

  // Load users on mount (only for admin)
  useEffect(() => {
    if (user?.role === 'admin' && userSearchResults.length === 0) {
      searchUsers('');
    }
  }, [user?.role, userSearchResults.length, searchUsers]);

  // Effects
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.role === 'admin') {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers, user?.role]);

  const handleViewProfile = (selectedUser) => {
    setTargetUserId(selectedUser.id);
    setShowUserList(false);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      password: '',
      role: 'teacher',
      teacher_id: '',
      is_active: true
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      password: '',
      role: user.role,
      teacher_id: user.teacher_id || '',
      is_active: user.is_active
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username wajib diisi';
    }
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Nama lengkap wajib diisi';
    }
    
    if (modalMode === 'add' && !formData.password) {
      errors.password = 'Password wajib diisi';
    }
    
    if (modalMode === 'add' && formData.password && formData.password.length < 6) {
      errors.password = 'Password minimal 6 karakter';
    }
    
    if (formData.role === 'teacher' && !formData.teacher_id.trim()) {
      errors.teacher_id = 'ID Guru wajib diisi untuk role teacher';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (modalMode === 'add') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `${formData.username}@temp.com`,
          password: formData.password,
        });

        if (authError) {
          showToast(`Gagal membuat user: ${authError.message}`, 'error');
          setSubmitting(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            username: formData.username,
            full_name: formData.full_name,
            role: formData.role,
            teacher_id: formData.role === 'teacher' ? formData.teacher_id : null,
            is_active: formData.is_active
          }]);

        if (insertError) {
          showToast(`Gagal menyimpan data user: ${insertError.message}`, 'error');
          setSubmitting(false);
          return;
        }

        showToast('User berhasil ditambahkan!', 'success');
        searchUsers('');
        setShowUserModal(false);
      } else if (modalMode === 'edit') {
        const updateData = {
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          teacher_id: formData.role === 'teacher' ? formData.teacher_id : null,
          is_active: formData.is_active
        };

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (updateError) {
          showToast(`Gagal mengupdate user: ${updateError.message}`, 'error');
          setSubmitting(false);
          return;
        }

        showToast('User berhasil diupdate!', 'success');
        searchUsers('');
        
        if (targetUserId === editingUser.id) {
          loadUserProfile(targetUserId);
        }
        
        setShowUserModal(false);
      }

      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      showToast('Terjadi kesalahan saat menyimpan data', 'error');
      setSubmitting(false);
    }
  };

  const handleDelete = async (deleteUser) => {
    if (deleteUser.id === userId) {
      showToast('Anda tidak bisa menghapus akun sendiri!', 'error');
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus user "${deleteUser.full_name}"? Tindakan ini tidak bisa dibatalkan!`)) {
      return;
    }

    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', deleteUser.id);

      if (deleteError) {
        showToast(`Gagal menghapus user: ${deleteError.message}`, 'error');
        setLoading(false);
        return;
      }

      showToast('User berhasil dihapus!', 'success');
      searchUsers('');
      
      if (targetUserId === deleteUser.id) {
        setTargetUserId(userId);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('Terjadi kesalahan saat menghapus user', 'error');
      setLoading(false);
    }
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

  const totalUsers = userSearchResults.length;
  const displayCount = searchQuery ? filteredUsers.length : totalUsers;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modal CRUD User */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  {modalMode === 'add' ? <Plus size={28} /> : <Edit2 size={28} />}
                  {modalMode === 'add' ? 'Tambah User Baru' : 'Edit User'}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    formErrors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan username"
                  disabled={modalMode === 'edit'}
                />
                {formErrors.username && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {formErrors.username}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    formErrors.full_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan nama lengkap"
                />
                {formErrors.full_name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {formErrors.full_name}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Password {modalMode === 'add' && <span className="text-red-500">*</span>}
                  {modalMode === 'edit' && <span className="text-gray-500 text-xs">(Kosongkan jika tidak ingin mengubah)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={modalMode === 'add' ? 'Masukkan password' : 'Kosongkan jika tidak ingin mengubah'}
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Teacher ID */}
              {formData.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ID Guru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacher_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                      formErrors.teacher_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan ID guru"
                  />
                  {formErrors.teacher_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {formErrors.teacher_id}
                    </p>
                  )}
                </div>
              )}

              {/* Is Active */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Akun Aktif</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Search Bar - Always Visible */}
      {isAdmin && (
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Cari pengguna berdasarkan nama, username, atau ID guru..."
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
              
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition shadow-lg font-bold flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={20} />
                Tambah User
              </button>
            </div>
            
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                Menampilkan {displayCount} dari {totalUsers} pengguna
              </div>
            )}
          </div>
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

      {/* Profile Display */}
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
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
              profileData.role === 'admin' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' 
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
            }`}>
              <Shield size={16} />
              {profileData.role === 'admin' ? 'Administrator' : 'Guru'}
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

      {/* Collapsible User List Section */}
      {isAdmin && (
        <div className="mb-8">
          <div 
            className={`bg-white rounded-2xl shadow-lg border-2 transition-all ${
              showUserList ? 'border-blue-300' : 'border-gray-200 hover:border-blue-200 cursor-pointer'
            }`}
          >
            <div 
              className="flex items-center justify-between p-5"
              onClick={() => !showUserList && setShowUserList(true)}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 transition-colors ${
                  showUserList ? 'bg-blue-500' : 'bg-gray-400'
                }`}>
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Semua Pengguna</h3>
                  <p className="text-sm text-gray-500">
                    {displayCount} {searchQuery ? 'hasil' : 'pengguna'} {searchQuery && `dari ${totalUsers}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserList(!showUserList);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
              >
                {showUserList ? (
                  <>
                    <ChevronUp size={20} />
                    Tutup
                  </>
                ) : (
                  <>
                    <ChevronDown size={20} />
                    Buka
                  </>
                )}
              </button>
            </div>

            {showUserList && (
              <div 
                className="border-t border-gray-200 animate-slideDown"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-[500px] overflow-y-auto p-4 custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={48} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {searchQuery ? 'Tidak ada pengguna yang ditemukan' : 'Belum ada pengguna'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((listUser) => (
                        <div 
                          key={listUser.id}
                          className="group flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {listUser.full_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {listUser.full_name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                @{listUser.username}
                              </p>
                            </div>
                          </div>
                          
                          <div className="hidden md:block px-4">
                            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                              {listUser.teacher_id || '-'}
                            </span>
                          </div>
                          
                          <div className="hidden sm:block px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                              listUser.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`h-2 w-2 rounded-full ${
                                listUser.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                              }`}></span>
                              {listUser.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                          
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewProfile(listUser)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Lihat Profil"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => openEditModal(listUser)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Edit User"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(listUser)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Hapus User"
                              disabled={listUser.id === userId}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards for Teachers */}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-6">
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

          {/* Homeroom Class Card */}
          {profileData.role === 'teacher' && profileData.homeroom_class && (
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
          )}
        </div>

        {/* Right Column - Role Based Content */}
        <div className="lg:col-span-2 space-y-6">
          {profileData.role === 'admin' ? (
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
                    <li>• Edit & hapus user</li>
                    <li>• Generate laporan sistem</li>
                    <li>• Backup & restore data</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
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

              {/* Empty State */}
              {currentAssignments.length === 0 && !profileData.homeroom_class && (
                <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
                  <div className="bg-gray-100 rounded-full p-6 w-fit mx-auto mb-4">
                    <BookOpen size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Tugas Mengajar</h3>
                  <p className="text-gray-500">{(isViewingOtherProfile ? 'User ini' : 'Anda')} belum memiliki mata pelajaran yang diajarkan untuk tahun ajaran ini.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
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