import React, { useState, useEffect } from 'react';
import { Users, XCircle } from 'lucide-react';

const KonselingModal = ({
  show,
  mode,
  formData,
  students,
  classes,
  onClose,
  onSubmit,
  onFormChange
}) => {
  const [studentFilters, setStudentFilters] = useState({
    jenjang: '',
    kelas: ''
  });
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableKelas, setAvailableKelas] = useState([]);

  // Reset filters when modal opens
  useEffect(() => {
    if (show) {
      setStudentFilters({
        jenjang: '',
        kelas: ''
      });
      setFilteredStudents([]);
      setAvailableKelas([]);
    }
  }, [show]);

  const updateAvailableKelas = (jenjang) => {
    if (jenjang) {
      const jenjangAngka = jenjang.replace('Kelas ', '');
      const kelasList = classes
        .filter(c => c.grade.toString() === jenjangAngka)
        .map(c => c.id)
        .sort();
      setAvailableKelas(kelasList);
    } else {
      setAvailableKelas([]);
    }
  };

  const updateFilteredStudents = (kelas) => {
    if (kelas) {
      const filtered = students.filter(s => s.class_id === kelas);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  const handleStudentSelect = (studentId) => {
    const selectedStudent = students.find(s => s.id === studentId);
    if (selectedStudent) {
      onFormChange({
        student_id: studentId,
        nis: selectedStudent.nis,
        full_name: selectedStudent.full_name,
        gender: selectedStudent.gender,
        class_id: selectedStudent.class_id
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleInputChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* MODAL LEBIH LEBAR: max-w-6xl (bisa disesuaikan) */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <div>
              <h2 className="text-xl font-bold">
                {mode === 'add' ? 'Tambah Data Konseling' : 
                 mode === 'edit' ? 'Edit Data Konseling' : 'Detail Konseling'}
              </h2>
              <p className="text-blue-100 text-sm">SMP Muslimin Cililin</p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                    setStudentFilters({
                      jenjang: jenjang,
                      kelas: ''
                    });
                    updateAvailableKelas(jenjang);
                    onFormChange({
                      student_id: '',
                      nis: '',
                      full_name: '',
                      gender: '',
                      class_id: ''
                    });
                  }}
                  disabled={mode === 'view'}
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
                    setStudentFilters(prev => ({ ...prev, kelas }));
                    updateFilteredStudents(kelas);
                    onFormChange({
                      student_id: '',
                      nis: '',
                      full_name: '',
                      gender: '',
                      class_id: ''
                    });
                  }}
                  disabled={!studentFilters.jenjang || mode === 'view'}
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
                disabled={!studentFilters.kelas || mode === 'view'}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <input
                type="text"
                value={formData.gender === 'L' ? 'Laki-laki' : formData.gender === 'P' ? 'Perempuan' : formData.gender}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-600"
              />
            </div>
          </div>

          {/* Date & Layanan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Konseling *
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => handleInputChange('tanggal', e.target.value)}
                disabled={mode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Layanan *
              </label>
              <select
                value={formData.jenis_layanan}
                onChange={(e) => handleInputChange('jenis_layanan', e.target.value)}
                disabled={mode === 'view'}
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
                onChange={(e) => handleInputChange('bidang_bimbingan', e.target.value)}
                disabled={mode === 'view'}
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

          {/* Text Areas - FULL WIDTH */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permasalahan *
              </label>
              <textarea
                value={formData.permasalahan}
                onChange={(e) => handleInputChange('permasalahan', e.target.value)}
                disabled={mode === 'view'}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                onChange={(e) => handleInputChange('kronologi', e.target.value)}
                disabled={mode === 'view'}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan kronologi kejadian..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tindakan Layanan
                </label>
                <textarea
                  value={formData.tindakan_layanan}
                  onChange={(e) => handleInputChange('tindakan_layanan', e.target.value)}
                  disabled={mode === 'view'}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Jelaskan tindakan yang dilakukan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasil Layanan
                </label>
                <textarea
                  value={formData.hasil_layanan}
                  onChange={(e) => handleInputChange('hasil_layanan', e.target.value)}
                  disabled={mode === 'view'}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Jelaskan hasil dari layanan yang diberikan..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rencana Tindak Lanjut
              </label>
              <textarea
                value={formData.rencana_tindak_lanjut}
                onChange={(e) => handleInputChange('rencana_tindak_lanjut', e.target.value)}
                disabled={mode === 'view'}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Jelaskan rencana tindak lanjut..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Layanan
            </label>
            <select
              value={formData.status_layanan}
              onChange={(e) => handleInputChange('status_layanan', e.target.value)}
              disabled={mode === 'view'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* Action Buttons */}
          {mode !== 'view' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
              >
                {mode === 'add' ? 'Tambah Data Konseling' : 'Update Data Konseling'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Batal
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default KonselingModal;