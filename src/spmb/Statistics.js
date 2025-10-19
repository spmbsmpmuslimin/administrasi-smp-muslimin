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
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [students]);

  const malePercentage = totalStudents > 0 ? (maleStudents / totalStudents) * 100 : 0;
  const femalePercentage = totalStudents > 0 ? (femaleStudents / totalStudents) * 100 : 0;

  const maxSchoolCount = getSchoolStats.length > 0 ? Math.max(...getSchoolStats.map(s => s.count)) : 0;

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Statistik</h1>
          <p className="text-gray-600">SMP Muslimin Cililin - Tahun Ajaran {getCurrentAcademicYear()}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-2">Total Pendaftar</div>
            <div className="text-4xl font-bold text-gray-900">{totalStudents}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-2">Siswa Laki-laki</div>
            <div className="text-4xl font-bold text-blue-600">{maleStudents}</div>
            <div className="text-sm text-gray-500 mt-1">{malePercentage.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-2">Siswa Perempuan</div>
            <div className="text-4xl font-bold text-rose-600">{femaleStudents}</div>
            <div className="text-sm text-gray-500 mt-1">{femalePercentage.toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Pie Chart - Gender Distribution */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-8">Distribusi Gender</h2>
            
            <div className="flex items-center justify-center mb-8">
              <svg width="280" height="280" viewBox="0 0 280 280" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="40"
                />
                {/* Male segment */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="40"
                  strokeDasharray={`${(malePercentage / 100) * 628} 628`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Female segment */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="40"
                  strokeDasharray={`${(femalePercentage / 100) * 628} 628`}
                  strokeDashoffset={`-${(malePercentage / 100) * 628}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Center text */}
                <text x="140" y="140" textAnchor="middle" dy="0.3em" className="text-4xl font-bold fill-gray-900 transform rotate-90" style={{transformOrigin: '140px 140px'}}>
                  {totalStudents}
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-blue-600"></div>
                <div>
                  <div className="text-sm text-gray-600">Laki-laki</div>
                  <div className="text-lg font-semibold text-gray-900">{maleStudents} ({malePercentage.toFixed(1)}%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-rose-600"></div>
                <div>
                  <div className="text-sm text-gray-600">Perempuan</div>
                  <div className="text-lg font-semibold text-gray-900">{femaleStudents} ({femalePercentage.toFixed(1)}%)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart - Top Schools */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-8">Asal Sekolah (Top 8)</h2>
            
            <div className="space-y-4">
              {getSchoolStats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Belum ada data</div>
              ) : (
                getSchoolStats.map((stat, index) => {
                  const barWidth = maxSchoolCount > 0 ? (stat.count / maxSchoolCount) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-700 truncate flex-1 mr-4" title={stat.school}>
                          {stat.school}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 tabular-nums">
                          {stat.count}
                        </div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg transition-all duration-1000 flex items-center px-3"
                          style={{ width: `${barWidth}%` }}
                        >
                          {barWidth > 15 && (
                            <span className="text-xs font-medium text-white">
                              {((stat.count / totalStudents) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Students - Table */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Pendaftar Terbaru</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">No</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nama Lengkap</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Asal Sekolah</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody>
                {!students || students.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-12 text-gray-400">
                      Belum ada pendaftar
                    </td>
                  </tr>
                ) : (
                  students.slice(0, 10).map((student, index) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">{student.nama_lengkap}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{student.asal_sekolah || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{student.tanggal_daftar || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Statistics;