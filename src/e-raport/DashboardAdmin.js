// src/components/DashboardAdmin.js

import { useState } from "react";
import { Settings, BarChart3, FileText, Users } from "lucide-react";
import KKMConfig from "./KKMConfig";
// Import komponen admin lain nanti di sini

function DashboardAdmin({ user, onShowToast, darkMode }) {
  const [activeTab, setActiveTab] = useState("monitoring"); // tab aktif

  // Cek apakah user adalah admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-gray-600">Halaman ini hanya untuk Administrator</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      {/* Header */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1
            className={`text-2xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Admin Dashboard E-Raport
          </h1>
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}>
            Kelola sistem e-raport sekolah
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} border-b`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "monitoring"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              <BarChart3 size={20} />
              Monitoring
            </button>

            <button
              onClick={() => setActiveTab("kkm")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "kkm"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              <Settings size={20} />
              Pengaturan KKM
            </button>

            <button
              onClick={() => setActiveTab("tp")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "tp"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              <FileText size={20} />
              Tujuan Pembelajaran
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              <Users size={20} />
              Manajemen User
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "monitoring" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Monitoring (Coming Soon)</h2>
            <p className="text-gray-600">
              Fitur monitoring akan segera hadir...
            </p>
          </div>
        )}

        {activeTab === "kkm" && (
          <KKMConfig
            user={user}
            onShowToast={onShowToast}
            darkMode={darkMode}
          />
        )}

        {activeTab === "tp" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Tujuan Pembelajaran (Coming Soon)
            </h2>
            <p className="text-gray-600">Fitur TP akan segera hadir...</p>
          </div>
        )}

        {activeTab === "users" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Manajemen User (Coming Soon)
            </h2>
            <p className="text-gray-600">
              Fitur user management akan segera hadir...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardAdmin;
