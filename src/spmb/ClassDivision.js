import React, { useState, useEffect, useCallback } from 'react';
import { exportClassDivision } from './SpmbExcel'; // ✅ Import dari utility

const ClassDivision = ({ 
  allStudents, 
  showToast, 
  isLoading: parentLoading,
  onRefreshData,
  supabase,
  getCurrentAcademicYear 
}) => {
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [classDistribution, setClassDistribution] = useState({});
  const [numClasses, setNumClasses] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeClassView, setActiveClassView] = useState(null);
  const [isExporting, setIsExporting] = useState(false); // ✅ State untuk export

  // Load siswa yang belum dibagi kelas
  useEffect(() => {
    const unassigned = allStudents.filter(s => 
      !s.is_transferred && !s.kelas && s.status === 'diterima'
    );
    setUnassignedStudents(unassigned);
  }, [allStudents]);

  // Algoritma Pembagian Kelas Otomatis
  const generateClassDistribution = useCallback(() => {
    if (unassignedStudents.length === 0) {
      showToast('Tidak ada siswa yang perlu dibagi kelas', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Kelompokkan berdasarkan gender
      const maleStudents = unassignedStudents.filter(s => s.jenis_kelamin === 'L');
      const femaleStudents = unassignedStudents.filter(s => s.jenis_kelamin === 'P');

      // 2. Sort berdasarkan asal sekolah untuk distribusi merata
      const sortBySchool = (students) => {
        return [...students].sort((a, b) => 
          (a.asal_sekolah || '').localeCompare(b.asal_sekolah || '')
        );
      };

      const sortedMales = sortBySchool(maleStudents);
      const sortedFemales = sortBySchool(femaleStudents);

      // 3. Generate nama kelas (7A, 7B, dst)
      const classNames = Array.from({ length: numClasses }, (_, i) => 
        `7${String.fromCharCode(65 + i)}`
      );

      // 4. Inisialisasi distribusi kelas
      const distribution = {};
      classNames.forEach(className => {
        distribution[className] = [];
      });

      // 5. Distribusi round-robin untuk balance
      let classIndex = 0;

      // Distribusi laki-laki
      sortedMales.forEach(student => {
        distribution[classNames[classIndex]].push(student);
        classIndex = (classIndex + 1) % numClasses;
      });

      // Distribusi perempuan
      classIndex = 0;
      sortedFemales.forEach(student => {
        distribution[classNames[classIndex]].push(student);
        classIndex = (classIndex + 1) % numClasses;
      });

      setClassDistribution(distribution);
      setShowPreview(true);
      showToast(`Berhasil generate pembagian ${numClasses} kelas!`, 'success');
    } catch (error) {
      console.error('Error generating distribution:', error);
      showToast('Gagal generate pembagian kelas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [unassignedStudents, numClasses, showToast]);

  // Simpan pembagian ke database
  const saveClassAssignments = useCallback(async () => {
    if (!window.confirm('Simpan pembagian kelas ini? Data tidak bisa diubah setelah disimpan.')) {
      return;
    }

    setIsLoading(true);
    try {
      const updates = [];

      Object.entries(classDistribution).forEach(([className, students]) => {
        students.forEach(student => {
          updates.push({
            id: student.id,
            kelas: className
          });
        });
      });

      // Batch update
      for (const update of updates) {
        const { error } = await supabase
          .from('siswa_baru')
          .update({ kelas: update.kelas })
          .eq('id', update.id);

        if (error) throw error;
      }

      showToast(`✅ Berhasil menyimpan pembagian ${updates.length} siswa!`, 'success');
      setShowPreview(false);
      setClassDistribution({});
      
      // Refresh data
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      showToast('❌ Gagal menyimpan pembagian kelas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [classDistribution, supabase, showToast, onRefreshData]);

  // Transfer ke tabel students
  const transferToStudents = useCallback(async () => {
    const studentsWithClass = allStudents.filter(s => 
      s.kelas && !s.is_transferred && s.status === 'diterima'
    );

    if (studentsWithClass.length === 0) {
      showToast('Tidak ada siswa dengan kelas yang bisa ditransfer', 'error');
      return;
    }

    if (!window.confirm(`Transfer ${studentsWithClass.length} siswa ke tabel Students?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const currentYear = getCurrentAcademicYear();

      for (const siswa of studentsWithClass) {
        // 1. Insert ke tabel students
        const { error: insertError } = await supabase
          .from('students')
          .insert([{
            full_name: siswa.nama_lengkap,
            nis: siswa.nisn,
            class_id: siswa.kelas,
            academic_year: currentYear,
            gender: siswa.jenis_kelamin,
            is_active: true
          }]);

        if (insertError) throw insertError;

        // 2. Update is_transferred di siswa_baru
        const { error: updateError } = await supabase
          .from('siswa_baru')
          .update({
            is_transferred: true,
            transferred_at: new Date().toISOString()
          })
          .eq('id', siswa.id);

        if (updateError) throw updateError;
      }

      showToast(`✅ Berhasil transfer ${studentsWithClass.length} siswa ke Students!`, 'success');
      
      // Refresh data
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error('Error transferring students:', error);
      showToast('❌ Gagal transfer siswa: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [allStudents, supabase, showToast, getCurrentAcademicYear, onRefreshData]);

  // ✅ UPDATED: Export ke Excel dengan multi-sheet
  const handleExportClassDivision = async () => {
    if (!classDistribution || Object.keys(classDistribution).length === 0) {
      showToast('Tidak ada pembagian kelas untuk di-export', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportClassDivision(classDistribution, showToast);
    } catch (error) {
      console.error('Error in handleExportClassDivision:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ NEW: Export kelas yang sudah tersimpan di database
  const handleExportSavedClasses = async () => {
    const studentsWithClass = allStudents.filter(s => 
      s.kelas && !s.is_transferred && s.status === 'diterima'
    );

    if (studentsWithClass.length === 0) {
      showToast('Tidak ada siswa dengan kelas yang bisa di-export', 'error');
      return;
    }

    // Group students by class
    const distribution = {};
    studentsWithClass.forEach(student => {
      const className = student.kelas;
      if (!distribution[className]) {
        distribution[className] = [];
      }
      distribution[className].push(student);
    });

    setIsExporting(true);
    try {
      await exportClassDivision(distribution, showToast);
    } catch (error) {
      console.error('Error in handleExportSavedClasses:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Hitung statistik per kelas
  const getClassStats = (students) => {
    const males = students.filter(s => s.jenis_kelamin === 'L').length;
    const females = students.filter(s => s.jenis_kelamin === 'P').length;
    const schools = [...new Set(students.map(s => s.asal_sekolah))];
    
    return {
      total: students.length,
      males,
      females,
      schoolCount: schools.length,
      schools
    };
  };

  const studentsWithClass = allStudents.filter(s => s.kelas && !s.is_transferred);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📚 Pembagian Kelas Otomatis</h2>
        <p className="text-purple-100">Distribusi siswa baru ke kelas 7A - 7F secara seimbang</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">Belum Dibagi Kelas</div>
          <div className="text-3xl font-bold text-blue-600">{unassignedStudents.length}</div>
          <div className="text-xs text-gray-500 mt-1">siswa menunggu pembagian</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600">Sudah Dibagi Kelas</div>
          <div className="text-3xl font-bold text-green-600">{studentsWithClass.length}</div>
          <div className="text-xs text-gray-500 mt-1">siswa siap ditransfer</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600">Sudah Transfer</div>
          <div className="text-3xl font-bold text-purple-600">
            {allStudents.filter(s => s.is_transferred).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">siswa aktif di sistem</div>
        </div>
      </div>

      {/* Control Panel */}
      {!showPreview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">⚙️ Pengaturan Pembagian</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Kelas
              </label>
              <select
                value={numClasses}
                onChange={(e) => setNumClasses(Number(e.target.value))}
                className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {[4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>
                    {num} Kelas (7A - 7{String.fromCharCode(64 + num)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateClassDistribution}
                disabled={isLoading || unassignedStudents.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                🎲 Generate Pembagian Otomatis
              </button>

              <button
                onClick={handleExportSavedClasses}
                disabled={isLoading || isExporting || studentsWithClass.length === 0}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-file-excel"></i>
                {isExporting ? 'Exporting...' : `Export Kelas Tersimpan (${studentsWithClass.length})`}
              </button>

              <button
                onClick={transferToStudents}
                disabled={isLoading || studentsWithClass.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                🚀 Transfer ke Students ({studentsWithClass.length})
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Cara Kerja:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sistem akan membagi siswa secara <strong>merata</strong> ke semua kelas</li>
                  <li>Menyeimbangkan <strong>jumlah laki-laki dan perempuan</strong> di setiap kelas</li>
                  <li>Mendistribusikan siswa dari <strong>SD yang sama</strong> ke kelas berbeda</li>
                  <li>Setelah puas dengan hasil, klik <strong>Simpan Pembagian</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Hasil Pembagian */}
      {showPreview && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-semibold">👁️ Preview Pembagian Kelas</h3>
              <div className="flex gap-2 flex-wrap">
                {/* ✅ Tombol Export */}
                <button
                  onClick={handleExportClassDivision}
                  disabled={isExporting || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 font-medium text-sm flex items-center gap-2"
                >
                  <i className="fas fa-file-excel"></i>
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
                
                <button
                  onClick={saveClassAssignments}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium text-sm"
                >
                  💾 Simpan Pembagian
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setClassDistribution({});
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                >
                  ❌ Batal
                </button>
              </div>
            </div>

            {/* Grid Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(classDistribution).map(([className, students]) => {
                const stats = getClassStats(students);
                return (
                  <div
                    key={className}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => setActiveClassView(className)}
                  >
                    <div className="text-center mb-3">
                      <h4 className="text-2xl font-bold text-blue-600">{className}</h4>
                      <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                      <div className="text-sm text-gray-500">siswa</div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">👦 Laki-laki:</span>
                        <span className="font-semibold">{stats.males}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">👧 Perempuan:</span>
                        <span className="font-semibold">{stats.females}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">🏫 Asal SD:</span>
                        <span className="font-semibold">{stats.schoolCount}</span>
                      </div>
                    </div>

                    <button className="w-full mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Lihat Detail →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Kelas */}
      {activeClassView && classDistribution[activeClassView] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Detail Kelas {activeClassView}</h3>
              <button
                onClick={() => setActiveClassView(null)}
                className="text-white hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                {(() => {
                  const stats = getClassStats(classDistribution[activeClassView]);
                  return (
                    <>
                      <div className="bg-blue-50 rounded p-3">
                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-xs text-gray-600">Total Siswa</div>
                      </div>
                      <div className="bg-green-50 rounded p-3">
                        <div className="text-2xl font-bold text-green-600">{stats.males}:{stats.females}</div>
                        <div className="text-xs text-gray-600">L : P</div>
                      </div>
                      <div className="bg-purple-50 rounded p-3">
                        <div className="text-2xl font-bold text-purple-600">{stats.schoolCount}</div>
                        <div className="text-xs text-gray-600">Asal SD</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">No</th>
                    <th className="p-2 text-left">Nama</th>
                    <th className="p-2 text-center">L/P</th>
                    <th className="p-2 text-left">Asal Sekolah</th>
                  </tr>
                </thead>
                <tbody>
                  {classDistribution[activeClassView].map((student, idx) => (
                    <tr key={student.id} className="border-t hover:bg-gray-50">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{student.nama_lengkap}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          student.jenis_kelamin === 'L' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {student.jenis_kelamin}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600">{student.asal_sekolah}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoading || isExporting) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">
              {isExporting ? 'Exporting Excel...' : 'Memproses...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDivision;