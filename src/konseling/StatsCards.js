import React from 'react';
import { Users, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Total Konseling */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total Konseling</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Semua data</p>
          </div>
          <div className="bg-blue-100 rounded-full p-3">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Kasus Darurat - NEW! */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Kasus Darurat</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.darurat}</p>
            <p className="text-xs text-red-500 mt-1">Prioritas utama</p>
          </div>
          <div className="bg-red-100 rounded-full p-3">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
        </div>
      </div>

      {/* Perlu Follow-up - NEW! */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Perlu Follow-up</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.perlu_followup}</p>
            <p className="text-xs text-purple-500 mt-1">Konseling lanjutan</p>
          </div>
          <div className="bg-purple-100 rounded-full p-3">
            <Calendar className="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Dalam Proses */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Dalam Proses</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.dalam_proses}</p>
            <p className="text-xs text-yellow-500 mt-1">Sedang ditangani</p>
          </div>
          <div className="bg-yellow-100 rounded-full p-3">
            <Clock className="w-7 h-7 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Selesai */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Selesai</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.selesai}</p>
            <p className="text-xs text-green-500 mt-1">Tuntas</p>
          </div>
          <div className="bg-green-100 rounded-full p-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;