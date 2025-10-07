import React, { useMemo } from 'react';

const Statistics = ({ students, totalStudents, maleStudents, femaleStudents, getCurrentAcademicYear }) => {
  const getSchoolStats = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    const schoolCounts = {};
    students.forEach(student => {
      const school = (student.asal_sekolah || 'Tidak Diketahui').trim();
      schoolCounts[school] = (schoolCounts[school] || 0) + 1;
    });

    return Object.entries(schoolCounts)
      .map(([school, count]) => ({ school, count }))
      .sort((a, b) => b.count - a.count);
  }, [students]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <i className="fas fa-chart-bar text-blue-600"></i>
        Laporan Statistik Pendaftaran SMP
      </h2>

      {/* Header Summary - Clean Blue Theme */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            SMP MUSLIMIN CILILIN
          </h3>
          <p className="text-blue-700 mb-4">
            Tahun Ajaran {getCurrentAcademicYear()}
          </p>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {totalStudents}
          </div>
          <p className="text-blue-600 font-semibold">Total Calon Siswa Baru</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Gender Statistics - Clean White Cards */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
            <i className="fas fa-users text-blue-500"></i>
            Statistik Jenis Kelamin
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-blue-700 font-semibold">Laki-laki</span>
                <span className="text-blue-700 font-semibold">{maleStudents} ({totalStudents > 0 ? Math.round((maleStudents / totalStudents) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${totalStudents > 0 ? (maleStudents / totalStudents) * 100 : 0}%` }}
                  aria-label={`Persentase siswa laki-laki: ${totalStudents > 0 ? Math.round((maleStudents / totalStudents) * 100) : 0}%`}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-blue-700 font-semibold">Perempuan</span>
                <span className="text-blue-700 font-semibold">{femaleStudents} ({totalStudents > 0 ? Math.round((femaleStudents / totalStudents) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-400 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${totalStudents > 0 ? (femaleStudents / totalStudents) * 100 : 0}%` }}
                  aria-label={`Persentase siswa perempuan: ${totalStudents > 0 ? Math.round((femaleStudents / totalStudents) * 100) : 0}%`}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-700">{maleStudents}</div>
              <div className="text-blue-600 text-sm">Siswa Laki-laki</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-700">{femaleStudents}</div>
              <div className="text-blue-600 text-sm">Siswa Perempuan</div>
            </div>
          </div>
        </div>

        {/* School Statistics - Clean White Cards */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
            <i className="fas fa-school text-blue-500"></i>
            Statistik Asal Sekolah Dasar
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {getSchoolStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada data sekolah</p>
            ) : (
              getSchoolStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2" title={stat.school}>
                    {stat.school}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 font-semibold text-sm">{stat.count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${totalStudents > 0 ? (stat.count / totalStudents) * 100 : 0}%` }}
                        aria-label={`${stat.school}: ${stat.count} siswa`}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards - Updated as requested */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
          <i className="fas fa-users text-3xl mb-2 text-blue-500"></i>
          <div className="text-2xl font-bold text-blue-700">{totalStudents}</div>
          <div className="text-blue-600">Total Siswa</div>
        </div>
        
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
          <i className="fas fa-male text-3xl mb-2 text-blue-500"></i>
          <div className="text-2xl font-bold text-blue-700">{maleStudents}</div>
          <div className="text-blue-600">Siswa Laki-laki</div>
        </div>
        
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
          <i className="fas fa-female text-3xl mb-2 text-blue-500"></i>
          <div className="text-2xl font-bold text-blue-700">{femaleStudents}</div>
          <div className="text-blue-600">Siswa Perempuan</div>
        </div>
      </div>

      {/* Recent Activity - Clean Theme */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          <i className="fas fa-clock text-blue-500"></i>
          Pendaftar Terbaru
        </h3>
        
        <div className="space-y-3">
          {!students || students.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Belum ada data pendaftar</p>
          ) : (
            students.slice(0, 5).map((student, index) => (
              <div key={student.id} className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{student.nama_lengkap}</div>
                    <div className="text-sm text-gray-500">{student.asal_sekolah || 'Tidak ada data'}</div>
                  </div>
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  {student.tanggal_daftar || 'Belum ada tanggal'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;