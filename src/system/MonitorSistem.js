import React from 'react';
import MonitorDashboard from './MonitorDashboard';

function MonitorSistem({ user, onShowToast }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Monitor Sistem</h1>
        <p className="text-gray-600 mt-1">
          Pemeriksaan kesehatan sistem dan integritas data
        </p>
      </div>

      <MonitorDashboard user={user} onShowToast={onShowToast} />
    </div>
  );
}

export default MonitorSistem;