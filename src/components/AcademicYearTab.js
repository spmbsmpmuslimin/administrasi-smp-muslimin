import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Plus, Trash2, Check, X, Edit2 } from 'lucide-react';

const AcademicYearTab = ({ onShowToast }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    year: '',
    semester: 1,
    start_date: '',
    end_date: ''
  });

  // Fetch academic years
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      onShowToast('Gagal memuat data tahun ajaran', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      // Jika mau set active, matikan yang lain dulu
      if (!currentStatus) {
        await supabase
          .from('academic_years')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('academic_years')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await fetchAcademicYears();
      onShowToast(
        !currentStatus ? 'Tahun ajaran diaktifkan' : 'Tahun ajaran dinonaktifkan',
        'success'
      );
    } catch (error) {
      console.error('Error toggling active:', error);
      onShowToast('Gagal mengubah status', 'error');
    }
  };

  // Add new academic year
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi: cek duplikat year + semester
      const { data: existing } = await supabase
        .from('academic_years')
        .select('id')
        .eq('year', formData.year)
        .eq('semester', formData.semester)
        .single();

      if (existing) {
        onShowToast('Tahun ajaran dan semester sudah ada', 'error');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('academic_years')
        .insert([formData]);

      if (error) throw error;

      await fetchAcademicYears();
      onShowToast('Tahun ajaran berhasil ditambahkan', 'success');
      setShowForm(false);
      setFormData({
        year: '',
        semester: 1,
        start_date: '',
        end_date: ''
      });
    } catch (error) {
      console.error('Error adding academic year:', error);
      onShowToast('Gagal menambah tahun ajaran', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete academic year
  const handleDelete = async (id, year, semester) => {
    if (!window.confirm(`Hapus tahun ajaran ${year} Semester ${semester}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAcademicYears();
      onShowToast('Tahun ajaran berhasil dihapus', 'success');
    } catch (error) {
      console.error('Error deleting:', error);
      onShowToast('Gagal menghapus tahun ajaran', 'error');
    }
  };

  if (loading && academicYears.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Tahun Ajaran</h2>
          <p className="text-sm text-gray-600">
            Kelola tahun ajaran dan semester aktif
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Batal' : 'Tambah'}
        </button>
      </div>

      {/* Form Tambah */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahun Ajaran *
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2025/2026"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY/YYYY</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester *
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={1}>1 (Ganjil)</option>
                  <option value={2}>2 (Genap)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Selesai *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>
      )}

      {/* List Tahun Ajaran */}
      <div className="space-y-3">
        {academicYears.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada tahun ajaran</p>
          </div>
        ) : (
          academicYears.map((year) => (
            <div
              key={year.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                year.is_active
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {year.year}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Semester {year.semester} ({year.semester === 1 ? 'Ganjil' : 'Genap'})
                    </span>
                    {year.is_active && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(year.start_date).toLocaleDateString('id-ID')} -{' '}
                    {new Date(year.end_date).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(year.id, year.is_active)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      year.is_active
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {year.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(year.id, year.year, year.semester)}
                    className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AcademicYearTab;