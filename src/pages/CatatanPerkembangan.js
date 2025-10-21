import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Search, TrendingUp, TrendingDown, Eye, AlertCircle, CheckCircle, Info, Trash2, Edit, X } from 'lucide-react';

// Komponen FormView yang terpisah
const FormView = ({ 
  formData, 
  onFormChange, 
  onSubmit, 
  onCancel, 
  siswaList, 
  editingNote, 
  loading,
  kategoris 
}) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFormChange(name, value);
  };

  const handleLabelSelect = (label) => {
    onFormChange('label', label);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingNote ? 'Edit Catatan' : 'Tambah Catatan Baru'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Kembali
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {!editingNote && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pilih Siswa <span className="text-red-500">*</span>
              </label>
              <select 
                name="student_id"
                value={formData.student_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Pilih Siswa --</option>
                {siswaList.map(s => (
                  <option key={s.id} value={s.id}>{s.nama} - {s.nis}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Pilih Kategori --</option>
              {kategoris.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Label <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleLabelSelect('positif')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                  formData.label === 'positif'
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Positif</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleLabelSelect('perhatian')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                  formData.label === 'perhatian'
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Perlu Perhatian</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleLabelSelect('netral')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                  formData.label === 'netral'
                    ? 'border-gray-500 bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Info className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-800">Netral</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Isi Catatan <span className="text-red-500">*</span>
            </label>
            <textarea
              name="note_content"
              rows="5"
              placeholder="Tuliskan observasi atau catatan tentang siswa..."
              value={formData.note_content}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tindakan yang Diambil <span className="text-gray-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              name="action_taken"
              rows="3"
              placeholder="Contoh: Sudah menghubungi orang tua, Sudah dipanggil untuk konseling..."
              value={formData.action_taken}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : (editingNote ? 'Update Catatan' : 'Simpan Catatan')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Komponen DashboardView yang terpisah
const DashboardView = ({ 
  currentClass, 
  academicYear, 
  semester, 
  stats, 
  searchTerm, 
  onSearchChange, 
  onAddNote, 
  loading, 
  siswaList, 
  filteredSiswa, 
  onViewDetail 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catatan Perkembangan Siswa</h2>
          <p className="text-gray-600">
            Kelas {currentClass} - {academicYear} ({semester})
          </p>
        </div>
        <button 
          onClick={onAddNote}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Catatan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm mb-1">Total Siswa</p>
          <p className="text-3xl font-bold text-gray-800">{stats.totalSiswa}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-gray-600 text-sm mb-1">Progress Positif</p>
          <p className="text-3xl font-bold text-green-600">{stats.progressPositif} Siswa</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-red-500">
          <p className="text-gray-600 text-sm mb-1">Perlu Perhatian</p>
          <p className="text-3xl font-bold text-red-600">{stats.perluPerhatian} Siswa</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari siswa berdasarkan nama atau NIS..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      ) : siswaList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600 text-lg">Tidak ada data siswa di kelas ini.</p>
          <p className="text-gray-500 text-sm mt-2">Pastikan sudah ada siswa yang terdaftar di kelas Anda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NIS</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Positif</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Perhatian</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Update Terakhir</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada siswa yang sesuai dengan pencarian "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{siswa.nama}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{siswa.nis}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        {siswa.positif}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {siswa.perhatian > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <TrendingDown className="w-4 h-4" />
                          {siswa.perhatian}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{siswa.lastUpdate}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onViewDetail(siswa)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Komponen DetailView yang terpisah
const DetailView = ({ 
  selectedSiswa, 
  catatanList, 
  loading, 
  onBack, 
  onAddNote, 
  onEditNote, 
  onDeleteNote,
  formatDate,
  getLabelBadge,
  getLabelIcon
}) => {
  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="text-gray-600 hover:text-gray-800 mb-4 font-medium"
      >
        ← Kembali ke Dashboard
      </button>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{selectedSiswa?.nama}</h2>
            <p className="text-gray-600 mt-1">NIS: {selectedSiswa?.nis}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Catatan Positif</p>
              <p className="text-3xl font-bold text-green-600">{selectedSiswa?.positif}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Perlu Perhatian</p>
              <p className="text-3xl font-bold text-red-600">{selectedSiswa?.perhatian}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Timeline Catatan</h3>
        <button
          onClick={onAddNote}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Catatan
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Memuat catatan...</p>
        </div>
      ) : catatanList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          Belum ada catatan untuk siswa ini
        </div>
      ) : (
        <div className="space-y-4">
          {catatanList.map((catatan) => (
            <div key={catatan.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4" style={{
              borderLeftColor: catatan.label === 'positif' ? '#10b981' : catatan.label === 'perhatian' ? '#ef4444' : '#6b7280'
            }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${getLabelBadge(catatan.label)}`}>
                    {getLabelIcon(catatan.label)}
                    {catatan.label === 'positif' ? 'Positif' : catatan.label === 'perhatian' ? 'Perlu Perhatian' : 'Netral'}
                  </span>
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {catatan.category}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">{formatDate(catatan.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditNote(catatan)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteNote(catatan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-800 leading-relaxed mb-2">{catatan.note_content}</p>
              {catatan.action_taken && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">Tindakan:</span> {catatan.action_taken}
                  </p>
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500">
                Oleh: {catatan.users?.full_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSiswa?.perhatian > 0 && (
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-5 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Perhatian Khusus</p>
              <p className="text-sm text-yellow-800">
                Terdeteksi pola yang perlu diperhatikan. Pertimbangkan untuk melakukan konsultasi lebih lanjut dengan guru BK.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen Utama
const CatatanPerkembangan = ({ user, onShowToast }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [siswaList, setSiswaList] = useState([]);
  const [catatanList, setCatatanList] = useState([]);
  const [stats, setStats] = useState({ totalSiswa: 0, progressPositif: 0, perluPerhatian: 0 });
  
  // Form states
  const [formData, setFormData] = useState({
    student_id: '',
    category: '',
    label: '',
    note_content: '',
    action_taken: ''
  });
  const [editingNote, setEditingNote] = useState(null);
  
  // User session data
  const [currentUser, setCurrentUser] = useState(null);
  const [currentClass, setCurrentClass] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [semester, setSemester] = useState('Ganjil');
  const [initError, setInitError] = useState(null);

  const kategoris = ['Akademik', 'Perilaku', 'Sosial', 'Karakter', 'Kesehatan'];

  // Get current user and class info
  useEffect(() => {
    if (user) {
      getCurrentUser();
    }
  }, [user]);

  // Load data when user is ready
  useEffect(() => {
    if (currentUser && currentClass) {
      loadDashboardData();
    }
  }, [currentUser, currentClass]);

  const getCurrentUser = async () => {
    try {
      setLoading(true);
      console.log('🔍 Getting current user...');
      
      if (!user) {
        console.warn('⚠️ No user prop provided');
        setInitError('Sesi tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }
      
      console.log('✅ User from props:', user);
      
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, homeroom_class_id, is_active, role')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('❌ Error verifying user:', userError);
        setInitError('Error memverifikasi sesi. Silakan login kembali.');
        setLoading(false);
        return;
      }
      
      if (!dbUser) {
        console.warn('⚠️ User not found in database');
        setInitError('Akun tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }
      
      if (!dbUser.is_active) {
        console.warn('⚠️ User account is inactive');
        setInitError('Akun Anda tidak aktif. Hubungi administrator.');
        setLoading(false);
        return;
      }
      
      console.log('📊 User verified:', dbUser);
      
      if (!dbUser.homeroom_class_id) {
        console.warn('⚠️ User has no homeroom class assigned');
        setInitError('Anda belum memiliki kelas yang di-assign. Hubungi administrator untuk assign kelas wali.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Homeroom class found:', dbUser.homeroom_class_id);
      
      setCurrentUser(dbUser);
      setCurrentClass(dbUser.homeroom_class_id);
      
      const { data: activeYear, error: yearError } = await supabase
        .from('academic_years')
        .select('year, semester')
        .eq('is_active', true)
        .single();
      
      if (yearError) {
        console.warn('⚠️ No active academic year found, using default');
      } else if (activeYear) {
        console.log('📅 Active academic year:', activeYear);
        setAcademicYear(activeYear.year);
        setSemester(activeYear.semester);
      }
      
      console.log('✅ User initialization complete');
      setLoading(false);
      
    } catch (err) {
      console.error('💥 Unexpected error in getCurrentUser:', err);
      setInitError(`Terjadi kesalahan: ${err.message}`);
      setLoading(false);
    }
  };

  // LOAD DASHBOARD DATA
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading dashboard data for class:', currentClass);
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, nis')
        .eq('class_id', currentClass)
        .eq('is_active', true)
        .eq('academic_year', academicYear)
        .order('full_name');

      if (studentsError) {
        console.error('❌ Error loading students:', studentsError);
        throw studentsError;
      }

      console.log(`✅ Loaded ${students?.length || 0} students`);

      if (!students || students.length === 0) {
        setSiswaList([]);
        setStats({ totalSiswa: 0, progressPositif: 0, perluPerhatian: 0 });
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);
      const { data: notes, error: notesError } = await supabase
        .from('student_development_notes')
        .select('student_id, label, created_at')
        .in('student_id', studentIds)
        .eq('academic_year', academicYear)
        .eq('semester', semester);

      if (notesError) {
        console.error('❌ Error loading notes:', notesError);
        throw notesError;
      }

      console.log(`✅ Loaded ${notes?.length || 0} notes`);

      const processedStudents = students.map(student => {
        const studentNotes = notes ? notes.filter(n => n.student_id === student.id) : [];
        const positif = studentNotes.filter(n => n.label === 'positif').length;
        const perhatian = studentNotes.filter(n => n.label === 'perhatian').length;
        const lastNote = studentNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
        return {
          id: student.id,
          nama: student.full_name,
          nis: student.nis,
          positif,
          perhatian,
          lastUpdate: lastNote ? formatRelativeTime(lastNote.created_at) : 'Belum ada catatan'
        };
      });

      setSiswaList(processedStudents);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentNotes = notes ? notes.filter(n => new Date(n.created_at) >= thirtyDaysAgo) : [];
      const uniquePositif = new Set(recentNotes.filter(n => n.label === 'positif').map(n => n.student_id));
      const uniquePerhatian = new Set(recentNotes.filter(n => n.label === 'perhatian').map(n => n.student_id));

      setStats({
        totalSiswa: students.length,
        progressPositif: uniquePositif.size,
        perluPerhatian: uniquePerhatian.size
      });

      console.log('✅ Dashboard data loaded successfully');

    } catch (err) {
      setError(err.message);
      console.error('💥 Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // LOAD STUDENT NOTES
  const loadStudentNotes = async (studentId) => {
    setLoading(true);
    try {
      console.log('📝 Loading notes for student:', studentId);
      
      const { data, error } = await supabase
        .from('student_development_notes')
        .select(`*, users!inner(full_name)`)
        .eq('student_id', studentId)
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Loaded ${data?.length || 0} notes for student`);
      setCatatanList(data || []);
    } catch (err) {
      setError(err.message);
      console.error('💥 Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // CREATE NOTE
  const handleCreateNote = async (e) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.category || !formData.label || !formData.note_content) {
      window.alert('Mohon lengkapi semua field yang wajib diisi!');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const noteData = {
        student_id: formData.student_id,
        teacher_id: currentUser.id,
        class_id: currentClass,
        academic_year: academicYear,
        semester: semester,
        category: formData.category,
        label: formData.label,
        note_content: formData.note_content,
        action_taken: formData.action_taken || null
      };

      console.log('💾 Creating note:', noteData);

      const { error } = await supabase
        .from('student_development_notes')
        .insert([noteData]);

      if (error) throw error;

      console.log('✅ Note created successfully');

      setFormData({
        student_id: '',
        category: '',
        label: '',
        note_content: '',
        action_taken: ''
      });

      await loadDashboardData();
      setActiveView('dashboard');
      
      if (onShowToast) {
        onShowToast('Catatan berhasil disimpan!', 'success');
      } else {
        window.alert('Catatan berhasil disimpan!');
      }

    } catch (err) {
      setError(err.message);
      console.error('💥 Error creating note:', err);
      window.alert('Gagal menyimpan catatan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // UPDATE NOTE
  const handleUpdateNote = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.label || !formData.note_content) {
      window.alert('Mohon lengkapi semua field yang wajib diisi!');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const updates = {
        category: formData.category,
        label: formData.label,
        note_content: formData.note_content,
        action_taken: formData.action_taken || null
      };

      console.log('💾 Updating note:', editingNote.id);

      const { error } = await supabase
        .from('student_development_notes')
        .update(updates)
        .eq('id', editingNote.id);

      if (error) throw error;

      console.log('✅ Note updated successfully');

      await loadStudentNotes(selectedSiswa.id);
      setEditingNote(null);
      setFormData({
        student_id: '',
        category: '',
        label: '',
        note_content: '',
        action_taken: ''
      });
      
      if (onShowToast) {
        onShowToast('Catatan berhasil diupdate!', 'success');
      } else {
        window.alert('Catatan berhasil diupdate!');
      }

    } catch (err) {
      setError(err.message);
      console.error('💥 Error updating note:', err);
      window.alert('Gagal update catatan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // DELETE NOTE
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Yakin ingin menghapus catatan ini?')) return;

    setLoading(true);
    try {
      console.log('🗑️ Deleting note:', noteId);
      
      const { error } = await supabase
        .from('student_development_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      console.log('✅ Note deleted successfully');

      await loadStudentNotes(selectedSiswa.id);
      await loadDashboardData();
      
      if (onShowToast) {
        onShowToast('Catatan berhasil dihapus!', 'success');
      } else {
        window.alert('Catatan berhasil dihapus!');
      }

    } catch (err) {
      setError(err.message);
      console.error('💥 Error deleting note:', err);
      window.alert('Gagal menghapus catatan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return '1 hari lalu';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
    return `${Math.floor(diffDays / 30)} bulan lalu`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getLabelIcon = (label) => {
    if (label === 'positif') return <CheckCircle className="w-4 h-4" />;
    if (label === 'perhatian') return <AlertCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const getLabelBadge = (label) => {
    if (label === 'positif') return 'bg-green-100 text-green-800';
    if (label === 'perhatian') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Memoized handlers
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleAddNote = useCallback(() => {
    setFormData({
      student_id: '',
      category: '',
      label: '',
      note_content: '',
      action_taken: ''
    });
    setEditingNote(null);
    setActiveView('form');
  }, []);

  const handleViewDetail = useCallback(async (siswa) => {
    setSelectedSiswa(siswa);
    await loadStudentNotes(siswa.id);
    setActiveView('detail');
  }, []);

  const handleEditNote = useCallback((catatan) => {
    setEditingNote(catatan);
    setFormData({
      student_id: catatan.student_id,
      category: catatan.category,
      label: catatan.label,
      note_content: catatan.note_content,
      action_taken: catatan.action_taken || ''
    });
    setActiveView('form');
  }, []);

  const handleCancelForm = useCallback(() => {
    setActiveView(editingNote ? 'detail' : 'dashboard');
    setEditingNote(null);
    setFormData({
      student_id: '',
      category: '',
      label: '',
      note_content: '',
      action_taken: ''
    });
  }, [editingNote]);

  const handleBackToDashboard = useCallback(() => {
    setActiveView('dashboard');
  }, []);

  const handleAddNoteFromDetail = useCallback(() => {
    setFormData({
      student_id: selectedSiswa.id,
      category: '',
      label: '',
      note_content: '',
      action_taken: ''
    });
    setActiveView('form');
  }, [selectedSiswa]);

  const filteredSiswa = useMemo(() => 
    siswaList.filter(s => 
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.nis.includes(searchTerm)
    ), [siswaList, searchTerm]
  );

  // MAIN RENDER
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {initError ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Tidak Dapat Memuat Data</h2>
            <p className="text-gray-600 mb-6">{initError}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setInitError(null);
                  setLoading(true);
                  getCurrentUser();
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                Coba Lagi
              </button>
              <div className="text-sm text-gray-500">
                <p>Jika masalah berlanjut, silakan:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Pastikan Anda sudah login</li>
                  <li>• Periksa koneksi internet Anda</li>
                  <li>• Hubungi administrator untuk assign kelas wali</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : loading && !currentUser ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Memuat data pengguna...</p>
            <p className="text-gray-500 text-sm mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      ) : (
        <>
          {activeView === 'dashboard' && (
            <DashboardView
              currentClass={currentClass}
              academicYear={academicYear}
              semester={semester}
              stats={stats}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onAddNote={handleAddNote}
              loading={loading}
              siswaList={siswaList}
              filteredSiswa={filteredSiswa}
              onViewDetail={handleViewDetail}
            />
          )}
          
          {activeView === 'form' && (
            <FormView
              formData={formData}
              onFormChange={handleFormChange}
              onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
              onCancel={handleCancelForm}
              siswaList={siswaList}
              editingNote={editingNote}
              loading={loading}
              kategoris={kategoris}
            />
          )}
          
          {activeView === 'detail' && (
            <DetailView
              selectedSiswa={selectedSiswa}
              catatanList={catatanList}
              loading={loading}
              onBack={handleBackToDashboard}
              onAddNote={handleAddNoteFromDetail}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              formatDate={formatDate}
              getLabelBadge={getLabelBadge}
              getLabelIcon={getLabelIcon}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CatatanPerkembangan;