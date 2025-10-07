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
  XCircle,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';

const Konseling = ({ user, onShowToast }) => {
  const [konselingData, setKonselingData] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]); // <- TAMBAH INI
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedKonseling, setSelectedKonseling] = useState(null);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    id: null,
    studentName: ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    kelas: '',
    status: '',
    tanggalAwal: '',
    tanggalAkhir: ''
  });

  // Student filter states untuk modal
  const [studentFilters, setStudentFilters] = useState({
    jenjang: '',
    kelas: ''
  });
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableKelas, setAvailableKelas] = useState([]);

  // Form state
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

  // Load data on component mount
  useEffect(() => {
    loadKonselingData();
    loadStudents();
    loadClasses(); // <- TAMBAH INI
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
      console.log('Loaded Students:', data); // Debug
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  // TAMBAH FUNCTION LOAD CLASSES
  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, grade')
        .eq('academic_year', '2025/2026')
        .order('id');

      if (error) throw error;
      console.log('Loaded Classes:', data); // Debug
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

  // PERBAIKI FUNCTION UPDATE AVAILABLE KELAS
  const updateAvailableKelas = (jenjang) => {
    if (jenjang) {
      const jenjangAngka = jenjang.replace('Kelas ', '');
      
      // Filter kelas dari data classes yang sesuai jenjang
      const kelasList = classes
        .filter(c => c.grade.toString() === jenjangAngka)
        .map(c => c.id)
        .sort();
      
      setAvailableKelas(kelasList);
      console.log('Available Kelas for', jenjang, ':', kelasList);
    } else {
      setAvailableKelas([]);
    }
  };

  // PERBAIKI FUNCTION UPDATE FILTERED STUDENTS
  const updateFilteredStudents = (kelas) => {
    if (kelas) {
      const filtered = students.filter(s => s.class_id === kelas);
      setFilteredStudents(filtered);
      console.log('Filtered Students for', kelas, ':', filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  // Filter functions
  const filteredKonseling = konselingData.filter(item => {
    const matchesSearch = !filters.search || 
      item.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.nis?.includes(filters.search);

    const matchesKelas = !filters.kelas || item.class_id === filters.kelas;
    const matchesStatus = !filters.status || item.status_layanan === filters.status;

    const itemDate = new Date(item.tanggal);
    const matchesTanggalAwal = !filters.tanggalAwal || itemDate >= new Date(filters.tanggalAwal);
    const matchesTanggalAkhir = !filters.tanggalAkhir || itemDate <= new Date(filters.tanggalAkhir);

    return matchesSearch && matchesKelas && matchesStatus && matchesTanggalAwal && matchesTanggalAkhir;
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

  // Student selection handler
  const handleStudentSelect = (studentId) => {
    const selectedStudent = students.find(s => s.id === studentId);
    if (selectedStudent) {
      setFormData(prev => ({
        ...prev,
        student_id: studentId,
        nis: selectedStudent.nis,
        full_name: selectedStudent.full_name,
        gender: selectedStudent.gender,
        class_id: selectedStudent.class_id
      }));
    }
  };

  // Form handlers
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
    
    // Reset student filters
    setStudentFilters({
      jenjang: '',
      kelas: ''
    });
    setFilteredStudents([]);
    setAvailableKelas([]);
    
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

    // Set student filters berdasarkan data yang ada
    const kelas = konseling.class_id;
    const jenjang = kelas ? `Kelas ${kelas.charAt(0)}` : '';
    
    setStudentFilters({
      jenjang: jenjang,
      kelas: kelas
    });
    
    // Update available kelas dan filtered students
    updateAvailableKelas(jenjang);
    if (kelas) {
      const filtered = students.filter(s => s.class_id === kelas);
      setFilteredStudents(filtered);
    }

    setSelectedKonseling(konseling);
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (konseling) => {
    setSelectedKonseling(konseling);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const konselingData = {
        ...formData,
        guru_bk_id: user.teacher_id || user.id,
        guru_bk_name: user.full_name,
        academic_year: '2025/2026',
        semester: 'Ganjil'
      };

      if (modalMode === 'add') {
        const { error } = await supabase
          .from('konseling')
          .insert([konselingData]);

        if (error) throw error;
        onShowToast('Data konseling berhasil ditambahkan', 'success');
      } else {
        const { error } = await supabase
          .from('konseling')
          .update(konselingData)
          .eq('id', selectedKonseling.id);

        if (error) throw error;
        onShowToast('Data konseling berhasil diupdate', 'success');
      }

      setShowModal(false);
      await loadKonselingData();
      
    } catch (error) {
      console.error('Error saving konseling data:', error);
      onShowToast('Error menyimpan data konseling', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete functions
  const handleDelete = (id, studentName) => {
    setDeleteConfirm({
      show: true,
      id: id,
      studentName: studentName
    });
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

  // Export PDF function
  const exportToPDF = (konselingItem) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, 210, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text('LAPORAN KONSELING BK/BP', 105, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text('SMP MUSLIMIN CILILIN', 105, 22, { align: 'center' });

      // Student info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      let yPosition = 45;
      
      pdf.text(`Nama Siswa: ${konselingItem.full_name}`, 20, yPosition);
      pdf.text(`NIS: ${konselingItem.nis}`, 20, yPosition + 7);
      pdf.text(`Kelas: ${konselingItem.class_id}`, 20, yPosition + 14);
      pdf.text(`Tanggal: ${new Date(konselingItem.tanggal).toLocaleDateString('id-ID')}`, 20, yPosition + 21);
      pdf.text(`Jenis Layanan: ${konselingItem.jenis_layanan}`, 20, yPosition + 28);
      pdf.text(`Bidang Bimbingan: ${konselingItem.bidang_bimbingan}`, 20, yPosition + 35);
      pdf.text(`Status: ${konselingItem.status_layanan}`, 20, yPosition + 42);
      pdf.text(`Guru BK: ${konselingItem.guru_bk_name}`, 20, yPosition + 49);

      // Content
      yPosition += 60;
      
      // Permasalahan
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('PERMASALAHAN:', 20, yPosition);
      pdf.setFont(undefined, 'normal');
      const permasalahanLines = pdf.splitTextToSize(konselingItem.permasalahan || 'Tidak diisi', 170);
      pdf.text(permasalahanLines, 20, yPosition + 7);
      yPosition += 7 + (permasalahanLines.length * 5);

      // Kronologi
      pdf.setFont(undefined, 'bold');
      pdf.text('KRONOLOGI:', 20, yPosition + 5);
      pdf.setFont(undefined, 'normal');
      const kronologiLines = pdf.splitTextToSize(konselingItem.kronologi || 'Tidak diisi', 170);
      pdf.text(kronologiLines, 20, yPosition + 12);
      yPosition += 12 + (kronologiLines.length * 5);

      // Tindakan Layanan
      pdf.setFont(undefined, 'bold');
      pdf.text('TINDAKAN LAYANAN:', 20, yPosition + 5);
      pdf.setFont(undefined, 'normal');
      const tindakanLines = pdf.splitTextToSize(konselingItem.tindakan_layanan || 'Tidak diisi', 170);
      pdf.text(tindakanLines, 20, yPosition + 12);
      yPosition += 12 + (tindakanLines.length * 5);

      // Hasil Layanan
      pdf.setFont(undefined, 'bold');
      pdf.text('HASIL LAYANAN:', 20, yPosition + 5);
      pdf.setFont(undefined, 'normal');
      const hasilLines = pdf.splitTextToSize(konselingItem.hasil_layanan || 'Tidak diisi', 170);
      pdf.text(hasilLines, 20, yPosition + 12);
      yPosition += 12 + (hasilLines.length * 5);

      // Rencana Tindak Lanjut
      pdf.setFont(undefined, 'bold');
      pdf.text('RENCANA TINDAK LANJUT:', 20, yPosition + 5);
      pdf.setFont(undefined, 'normal');
      const rencanaLines = pdf.splitTextToSize(konselingItem.rencana_tindak_lanjut || 'Tidak diisi', 170);
      pdf.text(rencanaLines, 20, yPosition + 12);

      // Footer
      const pageHeight = pdf.internal.pageSize.height;
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 20, pageHeight - 20);

      // Save PDF
      pdf.save(`konseling_${konselingItem.nis}_${konselingItem.full_name}.pdf`);
      
      onShowToast('PDF berhasil diunduh', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      onShowToast('Error membuat PDF', 'error');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Dalam Proses': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Dalam Proses' },
      'Selesai': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Selesai' },
      'Dibatalkan': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Dibatalkan' }
    };

    const config = statusConfig[status] || statusConfig['Dalam Proses'];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent size={12} />
        {config.label}
      </span>
    );
  };

  // Modal Component
  const KonselingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <div>
              <h2 className="text-xl font-bold">
                {modalMode === 'add' ? 'Tambah Data Konseling' : 
                 modalMode === 'edit' ? 'Edit Data Konseling' : 'Detail Konseling'}
              </h2>
              <p className="text-blue-100 text-sm">SMP Muslimin Cililin</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-blue-600 rounded-lg"
          >
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student Selection dengan Filter Berjenjang */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Jenjang *
                </label>
                <select
                  value={studentFilters.jenjang}
                  onChange={(e) => {
                    const jenjang = e.target.value;
                    console.log('Jenjang selected:', jenjang);
                    
                    setStudentFilters({
                      jenjang: jenjang,
                      kelas: ''
                    });
                    
                    updateAvailableKelas(jenjang);
                    
                    // Reset student selection
                    setFormData(prev => ({
                      ...prev,
                      student_id: '',
                      nis: '',
                      full_name: '',
                      gender: '',
                      class_id: ''
                    }));
                  }}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">-- Pilih Jenjang --</option>
                  <option value="Kelas 7">Kelas 7</option>
                  <option value="Kelas 8">Kelas 8</option>
                  <option value="Kelas 9">Kelas 9</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Kelas *
                </label>
                <select
                  value={studentFilters.kelas}
                  onChange={(e) => {
                    const kelas = e.target.value;
                    console.log('Kelas selected:', kelas);
                    
                    setStudentFilters(prev => ({ ...prev, kelas }));
                    
                    updateFilteredStudents(kelas);
                    
                    // Reset student selection
                    setFormData(prev => ({
                      ...prev,
                      student_id: '',
                      nis: '',
                      full_name: '',
                      gender: '',
                      class_id: ''
                    }));
                  }}
                  disabled={!studentFilters.jenjang || modalMode === 'view'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {availableKelas.map(kelas => (
                    <option key={kelas} value={kelas}>{kelas}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Siswa *
              </label>
              <select
                value={formData.student_id}
                onChange={(e) => handleStudentSelect(e.target.value)}
                disabled={!studentFilters.kelas || modalMode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">-- Pilih Siswa --</option>
                {filteredStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} (NIS: {student.nis})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {filteredStudents.length} siswa ditemukan di {studentFilters.kelas}
              </p>
            </div>
          </div>

          {/* Student Info (auto-filled) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
              <input
                type="text"
                value={formData.nis}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={formData.full_name}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <input
                type="text"
                value={formData.class_id}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-600"
              />
            </div>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Konseling *
            </label>
            <input
              type="date"
              value={formData.tanggal}
              onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
              disabled={modalMode === 'view'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              required
            />
          </div>

          {/* Layanan Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Layanan *
              </label>
              <select
                value={formData.jenis_layanan}
                onChange={(e) => setFormData(prev => ({ ...prev, jenis_layanan: e.target.value }))}
                disabled={modalMode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">Pilih Jenis Layanan</option>
                <option value="Pribadi">Pribadi</option>
                <option value="Sosial">Sosial</option>
                <option value="Belajar">Belajar</option>
                <option value="Karier">Karier</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bidang Bimbingan *
              </label>
              <select
                value={formData.bidang_bimbingan}
                onChange={(e) => setFormData(prev => ({ ...prev, bidang_bimbingan: e.target.value }))}
                disabled={modalMode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">Pilih Bidang Bimbingan</option>
                <option value="Pribadi dan Sosial">Pribadi dan Sosial</option>
                <option value="Akademik">Akademik</option>
                <option value="Karier dan Pekerjaan">Karier dan Pekerjaan</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Text Areas */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permasalahan *
              </label>
              <textarea
                value={formData.permasalahan}
                onChange={(e) => setFormData(prev => ({ ...prev, permasalahan: e.target.value }))}
                disabled={modalMode === 'view'}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan permasalahan yang dihadapi siswa..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kronologi *
              </label>
              <textarea
                value={formData.kronologi}
                onChange={(e) => setFormData(prev => ({ ...prev, kronologi: e.target.value }))}
                disabled={modalMode === 'view'}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan kronologi kejadian..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tindakan Layanan
              </label>
              <textarea
                value={formData.tindakan_layanan}
                onChange={(e) => setFormData(prev => ({ ...prev, tindakan_layanan: e.target.value }))}
                disabled={modalMode === 'view'}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan tindakan yang dilakukan..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasil Layanan
              </label>
              <textarea
                value={formData.hasil_layanan}
                onChange={(e) => setFormData(prev => ({ ...prev, hasil_layanan: e.target.value }))}
                disabled={modalMode === 'view'}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan hasil dari layanan yang diberikan..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rencana Tindak Lanjut
              </label>
              <textarea
                value={formData.rencana_tindak_lanjut}
                onChange={(e) => setFormData(prev => ({ ...prev, rencana_tindak_lanjut: e.target.value }))}
                disabled={modalMode === 'view'}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan rencana tindak lanjut..."
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Layanan
            </label>
            <select
              value={formData.status_layanan}
              onChange={(e) => setFormData(prev => ({ ...prev, status_layanan: e.target.value }))}
              disabled={modalMode === 'view'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* Action Buttons */}
          {modalMode !== 'view' && (
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Menyimpan...' : (modalMode === 'add' ? 'Tambah Data' : 'Update Data')}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  // Delete Confirmation Modal
  const DeleteConfirmModal = () => (
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
          <p className="text-sm text-red-600 mb-6">
            Tindakan ini tidak dapat dibatalkan!
          </p>

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
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Konseling BK/BP</h1>
        <p className="text-gray-600 mt-2">
          Manajemen data konseling dan bimbingan siswa
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Konseling</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Dalam Proses</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.dalam_proses}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Selesai</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.selesai}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cari berdasarkan nama atau NIS..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Awal</label>
              <input
                type="date"
                value={filters.tanggalAwal}
                onChange={(e) => setFilters(prev => ({ ...prev, tanggalAwal: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.tanggalAkhir}
                onChange={(e) => setFilters(prev => ({ ...prev, tanggalAkhir: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Reset
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Tambah Data
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Siswa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Layanan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bidang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guru BK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-500 mt-2">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredKonseling.length > 0 ? (
                filteredKonseling.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.full_name}</div>
                        <div className="text-sm text-gray-500">NIS: {item.nis} | Kelas: {item.class_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.jenis_layanan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.bidang_bimbingan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status_layanan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.guru_bk_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => exportToPDF(item)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Export PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.full_name)}
                          className="text-red-600 hover:text-red-800"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data konseling yang ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showModal && <KonselingModal />}
      {deleteConfirm.show && <DeleteConfirmModal />}
    </div>
  );
};

export default Konseling;