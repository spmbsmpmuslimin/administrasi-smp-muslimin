import React from 'react';
import AdminReports from './AdminReports';
import HomeroomTeacherReports from './HomeroomTeacherReports';
import TeacherReports from './TeacherReports';

const Reports = ({ user, onShowToast }) => {
  // Validasi user dan role
  if (!user || !user.role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600 mb-4">Anda tidak memiliki akses ke halaman laporan.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Render untuk Admin
  if (user.role === 'admin') {
    return <AdminReports user={user} onShowToast={onShowToast} />;
  }

  // Render untuk Teacher
  if (user.role === 'teacher') {
    // Cek apakah teacher ini juga wali kelas
    const isHomeroomTeacher = user.homeroom_class_id && user.homeroom_class_id.trim() !== '';
    
    if (isHomeroomTeacher) {
      return <HomeroomTeacherReports user={user} onShowToast={onShowToast} />;
    } else {
      return <TeacherReports user={user} onShowToast={onShowToast} />;
    }
  }

  // Fallback untuk role yang tidak dikenali
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❓</span>
        </div>
        <h2 className="text-xl font-bold text-yellow-600 mb-2">Role Tidak Dikenali</h2>
        <p className="text-slate-600 mb-2">
          Role "<span className="font-semibold">{user.role}</span>" tidak valid.
        </p>
        <p className="text-sm text-slate-500">Hubungi administrator untuk bantuan.</p>
      </div>
    </div>
  );
};

export default Reports;