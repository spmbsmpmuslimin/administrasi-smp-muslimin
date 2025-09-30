import React from 'react';
import AdminReports from './AdminReports';
import HomeroomTeacherReports from './HomeroomTeacherReports';
import TeacherReports from './TeacherReports';

const Reports = ({ user }) => {
  if (!user || !user.role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'admin':
      return <AdminReports user={user} />;
    case 'homeroom_teacher':
      return <HomeroomTeacherReports user={user} />;
    case 'teacher':
      return <TeacherReports user={user} />;
    default:
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Role Tidak Valid</h2>
            <p className="text-slate-600">Role "{user.role}" tidak dikenali sistem.</p>
          </div>
        </div>
      );
  }
};

export default Reports;