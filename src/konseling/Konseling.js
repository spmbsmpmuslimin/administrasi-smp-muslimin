import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import StatsCards from './StatsCards';
import FilterBar from './FilterBar';
import KonselingTable from './KonselingTable';
import KonselingModal from './KonselingModal';
import { exportKonselingPDF } from './ExportPDF';

const Konseling = ({ user, onShowToast }) => {
  const [konselingData, setKonselingData] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedKonseling, setSelectedKonseling] = useState(null);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    id: null,
    studentName: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    kelas: '',
    status: '',
    tanggalAwal: '',
    tanggalAkhir: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    student_id: '',
    nis: '',
    full_name: '',
    gender: '',
    class_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    jenis_layanan: '',
    bidang_bimbingan: '',
    permasalahan: '',
    kronologi: '',
    tindakan_layanan: '',
    hasil_layanan: '',
    rencana_tindak_lanjut: '',
    status_layanan: 'Dalam Proses'
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    dalam_proses: 0,
    selesai: 0
  });

  // Load data
  useEffect(() => {
    loadKonselingData();
    loadStudents();
    loadClasses();
  }, []);

  const loadKonselingData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('konseling')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setKonselingData(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading konseling data:', error);
      onShowToast('Error memuat data konseling', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, nis, full_name, gender, class_id')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, grade')
        .eq('academic_year', '2025/2026')
        .order('id');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const dalam_proses = data.filter(item => item.status_layanan === 'Dalam Proses').length;
    const selesai = data.filter(item => item.status_layanan === 'Selesai').length;
    setStats({ total, dalam_proses, selesai });
  };

  // Filter functions
  const filteredKonseling = konselingData.filter(item => {
    const matchesSearch = !filters.search || 
      item.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.nis?.includes(filters.search);
    const matchesStatus = !filters.status || item.status_layanan === filters.status;
    const itemDate = new Date(item.tanggal);
    const matchesTanggalAwal = !filters.tanggalAwal || itemDate >= new Date(filters.tanggalAwal);
    const matchesTanggalAkhir = !filters.tanggalAkhir || itemDate <= new Date(filters.tanggalAkhir);

    return matchesSearch && matchesStatus && matchesTanggalAwal && matchesTanggalAkhir;
  });

  const resetFilters = () => {
    setFilters({
      search: '',
      kelas: '',
      status: '',
      tanggalAwal: '',
      tanggalAkhir: ''
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      student_id: '',
      nis: '',
      full_name: '',
      gender: '',
      class_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      jenis_layanan: '',
      bidang_bimbingan: '',
      permasalahan: '',
      kronologi: '',
      tindakan_layanan: '',
      hasil_layanan: '',
      rencana_tindak_lanjut: '',
      status_layanan: 'Dalam Proses'
    });
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (konseling) => {
    setFormData({
      student_id: konseling.student_id,
      nis: konseling.nis,
      full_name: konseling.full_name,
      gender: konseling.gender,
      class_id: konseling.class_id,
      tanggal: konseling.tanggal.split('T')[0],
      jenis_layanan: konseling.jenis_layanan,
      bidang_bimbingan: konseling.bidang_bimbingan,
      permasalahan: konseling.permasalahan,
      kronologi: konseling.kronologi,
      tindakan_layanan: konseling.tindakan_layanan,
      hasil_layanan: konseling.hasil_layanan,
      rencana_tindak_lanjut: konseling.rencana_tindak_lanjut,
      status_layanan: konseling.status_layanan
    });
    setSelectedKonseling(konseling);
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (konseling) => {
    setSelectedKonseling(konseling);
    setModalMode('view');
    setShowModal(true);
  };

  const handleFormChange = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // ✅ FIXED: handleSubmit dengan validasi dan error handling yang proper
  const handleSubmit = async () => {
    try {
      // ✅ VALIDASI: Cek field wajib
      if (!formData.student_id) {
        onShowToast('Pilih siswa terlebih dahulu', 'error');
        return;
      }
      if (!formData.tanggal) {
        onShowToast('Tanggal konseling wajib diisi', 'error');
        return;
      }
      if (!formData.jenis_layanan) {
        onShowToast('Jenis layanan wajib dipilih', 'error');
        return;
      }
      if (!formData.bidang_bimbingan) {
        onShowToast('Bidang bimbingan wajib dipilih', 'error');
        return;
      }
      if (!formData.permasalahan?.trim()) {
        onShowToast('Permasalahan wajib diisi', 'error');
        return;
      }
      if (!formData.kronologi?.trim()) {
        onShowToast('Kronologi wajib diisi', 'error');
        return;
      }

      setLoading(true);
      
      // ✅ FIX: Gunakan user.id (UUID) bukan teacher_id
      const konselingData = {
        student_id: formData.student_id,
        nis: formData.nis,
        full_name: formData.full_name,
        gender: formData.gender,
        class_id: formData.class_id,
        tanggal: formData.tanggal,
        jenis_layanan: formData.jenis_layanan,
        bidang_bimbingan: formData.bidang_bimbingan,
        permasalahan: formData.permasalahan,
        kronologi: formData.kronologi,
        tindakan_layanan: formData.tindakan_layanan || null,
        hasil_layanan: formData.hasil_layanan || null,
        rencana_tindak_lanjut: formData.rencana_tindak_lanjut || null,
        status_layanan: formData.status_layanan,
        guru_bk_id: user.id, // ✅ PERBAIKAN: Pakai user.id (UUID)
        guru_bk_name: user.full_name,
        academic_year: '2025/2026',
        semester: '1'
      };

      if (modalMode === 'add') {
        const { data, error } = await supabase
          .from('konseling')
          .insert([konselingData])
          .select();
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Data inserted:', data);
        onShowToast('Data konseling berhasil ditambahkan', 'success');
      } else {
        const { data, error } = await supabase
          .from('konseling')
          .update(konselingData)
          .eq('id', selectedKonseling.id)
          .select();
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Data updated:', data);
        onShowToast('Data konseling berhasil diupdate', 'success');
      }

      setShowModal(false);
      await loadKonselingData();
    } catch (error) {
      console.error('Error saving konseling data:', error);
      onShowToast(`Error: ${error.message || 'Gagal menyimpan data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete functions
  const handleDelete = (id, studentName) => {
    setDeleteConfirm({ show: true, id, studentName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('konseling')
        .delete()
        .eq('id', deleteConfirm.id);
      if (error) throw error;
      onShowToast('Data konseling berhasil dihapus', 'success');
      await loadKonselingData();
    } catch (error) {
      console.error('Error deleting konseling data:', error);
      onShowToast('Error menghapus data konseling', 'error');
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, id: null, studentName: '' });
    }
  };

  // Export PDF
  const handleExportPDF = async (item) => {
    try {
      await exportKonselingPDF(item);
      onShowToast('PDF berhasil diunduh', 'success');
    } catch (error) {
      onShowToast('Error membuat PDF', 'error');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Konseling BK/BP</h1>
        <p className="text-gray-600 mt-2">Manajemen data konseling dan bimbingan siswa</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
        onOpenAddModal={openAddModal}
      />

      {/* Table */}
      <KonselingTable
        data={filteredKonseling}
        loading={loading}
        onView={openViewModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onExportPDF={handleExportPDF}
      />

      {/* Modals */}
      <KonselingModal
        show={showModal}
        mode={modalMode}
        formData={formData}
        students={students}
        classes={classes}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        onFormChange={handleFormChange}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-red-50 border-b border-red-200 p-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <XCircle className="text-red-600" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-red-800">Konfirmasi Hapus</h2>
                  <p className="text-red-600 text-sm">Data konseling akan dihapus permanen</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Apakah Anda yakin ingin menghapus data konseling untuk siswa {' '}
                <strong>{deleteConfirm.studentName}</strong>?
              </p>
              <p className="text-sm text-red-600 mb-6">Tindakan ini tidak dapat dibatalkan!</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: null, studentName: '' })}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Konseling;