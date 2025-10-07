import React from 'react';
import { Users, Clock, CheckCircle } from 'lucide-react';

const StatsCards = ({ stats }) => {
  return (
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
  );
};

export default StatsCards;