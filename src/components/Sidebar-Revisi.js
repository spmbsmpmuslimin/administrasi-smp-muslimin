import React, { useState } from "react";
import logoSekolah from "../assets/logo_sekolah.png";

const Sidebar = ({
  currentPage,
  onNavigate,
  isOpen,
  userRole,
  isWaliKelas,
  userData = {},
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isGuruBK = userRole === "guru_bk";
  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher";

  const fullName = userData.full_name || "User";
  const roleName =
    userRole === "admin"
      ? "Administrator"
      : userRole === "guru_bk"
      ? "Guru BK"
      : isWaliKelas
      ? `Wali Kelas ${userData.homeroom_class_name || ""}`
      : userRole === "teacher"
      ? "Guru"
      : "Pengguna";

  const getInitials = (name) => {
    const words = name
      .trim()
      .split(" ")
      .filter((word) => word.length > 0);
    if (words.length === 0) return "U";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(fullName);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`
      h-screen ${isCollapsed ? "w-20" : "w-64"}
      bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900
      dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
      text-white border-r border-blue-800 dark:border-slate-700
      overflow-y-auto transition-all duration-300 flex flex-col
      fixed lg:relative left-0 top-0 z-50
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      scrollbar-thin scrollbar-thumb-blue-700 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent
    `}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-blue-700 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                <img
                  src={logoSekolah}
                  alt="Logo SMP Muslimin Cililin"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-bold text-white leading-tight">
                  SMP MUSLIMIN
                </div>
                <div className="text-sm sm:text-lg font-bold text-white leading-tight mt-1">
                  CILILIN
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-lg mx-auto">
              <img
                src={logoSekolah}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Toggle Button - Hidden on mobile */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-2 rounded-lg bg-blue-700/40 dark:bg-slate-700/40 hover:bg-blue-600/40 dark:hover:bg-slate-600/40 transition-all duration-200 flex-shrink-0"
            title={isCollapsed ? "Expand" : "Collapse"}>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="py-2 sm:py-4 flex-1">
        {/* Menu Utama */}
        <div className="mb-3 sm:mb-5">
          {!isCollapsed && (
            <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-slate-400 tracking-wider">
              Menu Utama
            </div>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-blue-700/30 dark:bg-slate-700/30 mb-2"></div>
          )}
          <a
            href="#dashboard"
            className={`
              flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
              ${isCollapsed ? "justify-center" : "hover:pl-8"}
              ${
                currentPage === "dashboard"
                  ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                  : "hover:text-blue-100 dark:hover:text-slate-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("dashboard");
            }}
            title={isCollapsed ? "Dashboard" : ""}>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m7 7 5-5 5 5"
              />
            </svg>
            {!isCollapsed && <span className="flex-1 text-sm">Dashboard</span>}
          </a>
        </div>

        {/* Master Data */}
        <div className="mb-3 sm:mb-5">
          {!isCollapsed && (
            <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-slate-400 tracking-wider">
              Master Data
            </div>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-blue-700/30 dark:bg-slate-700/30 mb-2"></div>
          )}

          {/* Data Guru */}
          <a
            href="#teachers"
            className={`
              flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
              ${isCollapsed ? "justify-center" : "hover:pl-8"}
              ${
                currentPage === "teachers"
                  ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                  : "hover:text-blue-100 dark:hover:text-slate-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("teachers");
            }}
            title={isCollapsed ? "Data Guru" : ""}>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {!isCollapsed && <span className="flex-1 text-sm">Data Guru</span>}
          </a>

          {/* Data Kelas */}
          <a
            href="#classes"
            className={`
              flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
              ${isCollapsed ? "justify-center" : "hover:pl-8"}
              ${
                currentPage === "classes"
                  ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                  : "hover:text-blue-100 dark:hover:text-slate-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("classes");
            }}
            title={isCollapsed ? "Data Kelas" : ""}>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {!isCollapsed && <span className="flex-1 text-sm">Data Kelas</span>}
          </a>

          {/* Data Siswa */}
          <a
            href="#students"
            className={`
              flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
              ${isCollapsed ? "justify-center" : "hover:pl-8"}
              ${
                currentPage === "students"
                  ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                  : "hover:text-blue-100 dark:hover:text-slate-100"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              onNavigate("students");
            }}
            title={isCollapsed ? "Data Siswa" : ""}>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            {!isCollapsed && <span className="flex-1 text-sm">Data Siswa</span>}
          </a>
        </div>

        {/* Akademik */}
        <div className="mb-3 sm:mb-5">
          {!isCollapsed && (
            <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-slate-400 tracking-wider">
              Akademik
            </div>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-blue-700/30 dark:bg-slate-700/30 mb-2"></div>
          )}

          {/* Presensi Guru */}
          {(isAdmin || isTeacher || isGuruBK) && (
            <a
              href="#attendance-teacher"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "attendance-teacher"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("attendance-teacher");
              }}
              title={isCollapsed ? "Presensi Guru" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Presensi Guru</span>
              )}
            </a>
          )}

          {/* Presensi Siswa */}
          {(isAdmin || !isGuruBK) && (
            <a
              href="#attendance"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "attendance"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("attendance");
              }}
              title={isCollapsed ? "Presensi Siswa" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Presensi Siswa</span>
              )}
            </a>
          )}

          {/* Management Presensi */}
          {false && isAdmin && (
            <a
              href="#attendance-management"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "attendance-management"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("attendance-management");
              }}
              title={isCollapsed ? "Management Presensi" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Management Presensi</span>
              )}
            </a>
          )}

          {/* Nilai */}
          {(isAdmin || !isGuruBK) && (
            <a
              href="#grades"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "grades"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("grades");
              }}
              title={isCollapsed ? "Nilai Siswa" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Nilai Siswa</span>
              )}
            </a>
          )}

          {/* Catatan Siswa */}
          {(isAdmin || (isWaliKelas && !isGuruBK)) && (
            <a
              href="#catatan-siswa"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "catatan-siswa"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("catatan-siswa");
              }}
              title={isCollapsed ? "Catatan Siswa" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Catatan Siswa</span>
              )}
            </a>
          )}

          {/* Jadwal Saya */}
          {(isAdmin ||
            (!isGuruBK &&
              (userRole === "teacher" || userRole === "homeroom"))) && (
            <a
              href="#jadwal-saya"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "jadwal-saya"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("jadwal-saya");
              }}
              title={isCollapsed ? "Jadwal Saya" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Jadwal Saya</span>
              )}
            </a>
          )}

          {/* Konseling */}
          {(isAdmin || isGuruBK) && (
            <a
              href="#konseling"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "konseling"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("konseling");
              }}
              title={isCollapsed ? "Konseling" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Konseling</span>
              )}
            </a>
          )}

          {/* Laporan */}
          {(isAdmin || isGuruBK || userRole === "teacher") && (
            <a
              href="#reports"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "reports"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("reports");
              }}
              title={isCollapsed ? "Laporan" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {!isCollapsed && <span className="flex-1 text-sm">Laporan</span>}
            </a>
          )}
        </div>

        {/* Admin Settings */}
        {userRole === "admin" && (
          <div className="mb-4">
            {!isCollapsed && (
              <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-slate-400 tracking-wider">
                Sistem
              </div>
            )}
            {isCollapsed && (
              <div className="w-full h-px bg-blue-700/30 dark:bg-slate-700/30 mb-2"></div>
            )}

            {/* SPMB */}
            <a
              href="#spmb"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "spmb"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("spmb");
              }}
              title={isCollapsed ? "SPMB" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {!isCollapsed && <span className="flex-1 text-sm">SPMB</span>}
            </a>

            {/* Pengaturan */}
            <a
              href="#settings"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "settings"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("settings");
              }}
              title={isCollapsed ? "Pengaturan" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Pengaturan</span>
              )}
            </a>

            {/* Monitor Sistem */}
            <a
              href="#monitor-sistem"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-700 rounded-r-full mr-4
                ${isCollapsed ? "justify-center" : "hover:pl-8"}
                ${
                  currentPage === "monitor-sistem"
                    ? "bg-blue-800 dark:bg-slate-700 border-r-4 border-blue-400 dark:border-cyan-500 font-semibold text-blue-100 dark:text-slate-100 pl-8"
                    : "hover:text-blue-100 dark:hover:text-slate-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("monitor-sistem");
              }}
              title={isCollapsed ? "Monitor Sistem" : ""}>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              {!isCollapsed && (
                <span className="flex-1 text-sm">Monitor Sistem</span>
              )}
            </a>
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto border-t border-blue-700 dark:border-slate-700 p-3 sm:p-4 bg-blue-800 dark:bg-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {fullName}
              </div>
              <div className="text-xs text-blue-200 dark:text-slate-300 truncate">
                {roleName}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-10 h-10 bg-blue-600 dark:bg-slate-600 rounded-full flex items-center justify-center shadow-md"
              title={fullName}>
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
