import React from "react";

const Sidebar = ({ currentPage, onNavigate, isOpen, userRole }) => {
  return (
    <div className={`
      h-screen w-60
      bg-blue-900 text-white border-r border-blue-800
      overflow-y-auto transition-all duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Header */}
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6zM18.82 9L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-white leading-tight">SMP Muslimin</div>
            <div className="text-sm font-medium text-blue-200 leading-tight mt-1">Cililin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="py-6">
        {/* Menu Utama */}
        <div className="mb-8">
          <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
            Menu Utama
          </div>
          <a
            href="#dashboard"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "dashboard" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("dashboard");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 7 5-5 5 5" />
            </svg>
            <span className="flex-1 text-sm">Dashboard</span>
          </a>
        </div>

        {/* Master Data */}
        <div className="mb-8">
          <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
            Master Data
          </div>
          
          {/* Data Guru */}
          <a
            href="#teachers"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "teachers" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("teachers");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="flex-1 text-sm">Data Guru</span>
          </a>

          {/* Data Kelas */}
          <a
            href="#classes"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "classes" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("classes");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="flex-1 text-sm">Data Kelas</span>
          </a>

          {/* Data Siswa */}
          <a
            href="#students"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "students" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("students");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="flex-1 text-sm">Data Siswa</span>
          </a>
        </div>

        {/* Akademik */}
        <div className="mb-8">
          <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
            Akademik
          </div>
          
          {/* Presensi */}
          <a
            href="#attendance"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "attendance" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("attendance");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="flex-1 text-sm">Presensi</span>
          </a>

          {/* Nilai */}
          <a
            href="#grades"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "grades" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("grades");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="flex-1 text-sm">Nilai</span>
          </a>
        </div>

        {/* Laporan */}
        <div className="mb-8">
          <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
            Laporan
          </div>
          <a
            href="#reports"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "reports" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("reports");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="flex-1 text-sm">Laporan</span>
          </a>
        </div>

        {/* EasyModul */}
        <div className="mb-8">
          <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
            E-Learning
          </div>
          <a
            href="#easymodul"
            className={`
              flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
              ${currentPage === "easymodul" 
                ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                : "hover:text-blue-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("easymodul");
            }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="flex-1 text-sm">EasyModul</span>
          </a>
        </div>

        {/* Admin Settings - conditional */}
        {userRole === "admin" && (
          <div className="mb-6">
            <div className="px-6 pb-3 text-xs uppercase font-semibold text-blue-300 tracking-wider mb-2">
              Sistem
            </div>
            <a
              href="#settings"
              className={`
                flex items-center gap-3 px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 hover:pl-8 mb-1 rounded-r-full mr-4
                ${currentPage === "settings" 
                  ? "bg-blue-800 border-r-4 border-blue-400 font-semibold text-blue-100 pl-8" 
                  : "hover:text-blue-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("settings");
              }}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="flex-1 text-sm">Pengaturan</span>
            </a>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;