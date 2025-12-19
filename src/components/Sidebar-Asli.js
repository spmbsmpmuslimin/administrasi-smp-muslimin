//[file name]: Sidebar.js
import React, { useState, useEffect } from "react";
import sekolahLogo from "../assets/logo_sekolah.png";
import { supabase } from "../supabaseClient"; // ✅ TAMBAH IMPORT SUPA

const Sidebar = ({
  currentPage,
  onNavigate,
  isOpen,
  isCollapsed = false,
  userRole,
  isWaliKelas,
  userData = {},
  darkMode = false,
  onClose = null,
  onToggleCollapse = null,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(darkMode);
  const [gradesMenuOpen, setGradesMenuOpen] = useState(false); // State untuk dropdown Nilai Siswa
  const [eraMenuOpen, setEraMenuOpen] = useState(false); // State untuk dropdown E-RAPORT
  const [inputDataOpen, setInputDataOpen] = useState(false); // State untuk dropdown Input Data
  const [cetakNilaiOpen, setCetakNilaiOpen] = useState(false); // State untuk dropdown Cetak Nilai

  // ✅ TAMBAH STATE UNTUK E-RAPORT STATUS
  const [eraportActive, setEraportActive] = useState(true);

  useEffect(() => {
    setIsDarkMode(darkMode);
  }, [darkMode]);

  // ✅ TAMBAH useEffect UNTUK FETCH E-RAPORT STATUS
  useEffect(() => {
    const fetchEraportStatus = async () => {
      try {
        const { data } = await supabase
          .from("eraport_settings")
          .select("is_active")
          .single();

        setEraportActive(data?.is_active ?? true);
      } catch (error) {
        console.error("Error fetching eraport status:", error);
        setEraportActive(true); // Default aktif kalau error
      }
    };

    fetchEraportStatus();

    // ✅ REALTIME SUBSCRIPTION - auto update tanpa refresh!
    const channel = supabase
      .channel("eraport-toggle")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "eraport_settings",
        },
        (payload) => {
          setEraportActive(payload.new.is_active);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const handleMenuClick = (page) => {
    onNavigate(page);
    if (onClose) onClose();
  };

  // Handle khusus untuk menu Nilai Siswa
  const handleGradesMenuClick = (page) => {
    handleMenuClick(page);
    setGradesMenuOpen(false); // Tutup dropdown setelah memilih
  };

  // Handle khusus untuk menu E-RAPORT
  const handleEraMenuClick = (page) => {
    handleMenuClick(page);
  };

  // Cek apakah halaman saat ini adalah salah satu dari submenu nilai
  const isNilaiPage =
    currentPage === "nilai-asli" || currentPage === "nilai-katrol";

  // Cek apakah halaman saat ini adalah salah satu dari submenu E-RAPORT
  const isEraPage =
    currentPage === "era-dashboard-admin" ||
    currentPage === "era-dashboard-teacher" ||
    currentPage === "era-dashboard-homeroom" ||
    currentPage === "era-input-tp" ||
    currentPage === "era-input-nilai" ||
    currentPage === "era-input-kehadiran" ||
    currentPage === "era-input-catatan" ||
    currentPage === "era-cek-kelengkapan" ||
    currentPage === "era-cetak-raport";

  return (
    <div
      className={`h-screen transition-colors duration-300 ${
        isDarkMode ? "dark" : ""
      }`}>
      <div
        className={`
        h-full transition-all duration-300 flex flex-col
        ${isCollapsed ? "w-20" : "w-64"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        sm:translate-x-0 sm:relative
        bg-blue-900 dark:bg-gray-900 text-white border-r border-blue-800 dark:border-gray-800
        overflow-y-auto
      `}>
        {/* Header - sama seperti sebelumnya */}
        <div className="p-4 sm:p-6 border-b border-blue-700 dark:border-gray-800">
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 p-2 text-blue-400 hover:text-white">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {onToggleCollapse && isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:block p-2 text-blue-300 hover:text-white dark:text-gray-400 dark:hover:text-white"
              title="Expand sidebar">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          <div
            className={`flex items-center gap-3 ${
              isCollapsed ? "justify-center" : ""
            }`}>
            <div
              className={`${
                isCollapsed ? "w-10 h-10" : "w-10 h-10 sm:w-12 sm:h-12"
              } bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden shadow-lg`}>
              <img
                src={sekolahLogo}
                alt="Logo SMP Muslimin Cililin"
                className="w-full h-full object-cover"
              />
            </div>

            {!isCollapsed && (
              <div>
                <div className="text-base sm:text-lg font-bold text-white dark:text-gray-100 leading-tight">
                  SMP MUSLIMIN
                </div>
                <div className="text-base sm:text-lg font-bold text-white dark:text-gray-100 leading-tight">
                  CILILIN
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-4 flex-1">
          {/* Menu Utama */}
          <div className="mb-4 sm:mb-5">
            {!isCollapsed && (
              <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                Menu Utama
              </div>
            )}
            <a
              href="#dashboard"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                touch-manipulation min-h-[44px]
                ${isCollapsed ? "justify-center" : ""}
                ${
                  currentPage === "dashboard"
                    ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                    : "hover:text-blue-100 dark:hover:text-gray-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                handleMenuClick("dashboard");
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
              {!isCollapsed && (
                <span className="flex-1 text-sm">Dashboard</span>
              )}
            </a>
          </div>

          {/* Master Data */}
          <div className="mb-4 sm:mb-5">
            {!isCollapsed && (
              <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                Master Data
              </div>
            )}

            {/* Data Guru */}
            <a
              href="#teachers"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                touch-manipulation min-h-[44px]
                ${isCollapsed ? "justify-center" : ""}
                ${
                  currentPage === "teachers"
                    ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                    : "hover:text-blue-100 dark:hover:text-gray-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                handleMenuClick("teachers");
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
              {!isCollapsed && (
                <span className="flex-1 text-sm">Data Guru</span>
              )}
            </a>

            {/* Data Kelas */}
            <a
              href="#classes"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                touch-manipulation min-h-[44px]
                ${isCollapsed ? "justify-center" : ""}
                ${
                  currentPage === "classes"
                    ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                    : "hover:text-blue-100 dark:hover:text-gray-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                handleMenuClick("classes");
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
              {!isCollapsed && (
                <span className="flex-1 text-sm">Data Kelas</span>
              )}
            </a>

            {/* Data Siswa */}
            <a
              href="#students"
              className={`
                flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                touch-manipulation min-h-[44px]
                ${isCollapsed ? "justify-center" : ""}
                ${
                  currentPage === "students"
                    ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                    : "hover:text-blue-100 dark:hover:text-gray-100"
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                handleMenuClick("students");
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
              {!isCollapsed && (
                <span className="flex-1 text-sm">Data Siswa</span>
              )}
            </a>
          </div>

          {/* Akademik */}
          <div className="mb-4 sm:mb-5">
            {!isCollapsed && (
              <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                Akademik
              </div>
            )}

            {/* ✅ PRESENSI GURU */}
            {(isAdmin || isTeacher || isGuruBK) && (
              <a
                href="#attendance-teacher"
                className={`
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "attendance-teacher"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("attendance-teacher");
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
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "attendance"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("attendance");
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

            {/* Management Presensi - HANYA UNTUK ADMIN */}
            {false && isAdmin && (
              <a
                href="#attendance-management"
                className={`
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "attendance-management"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("attendance-management");
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

            {/* NILAI SISWA dengan Submenu */}
            {(isAdmin || !isGuruBK) && (
              <div className="mb-1">
                {/* Menu Utama Nilai Siswa */}
                <a
                  href="#nilai-siswa"
                  className={`
                    flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                    touch-manipulation min-h-[44px]
                    ${isCollapsed ? "justify-center" : ""}
                    ${
                      isNilaiPage
                        ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                        : "hover:text-blue-100 dark:hover:text-gray-100"
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isCollapsed) {
                      setGradesMenuOpen(!gradesMenuOpen);
                    } else {
                      // Jika collapsed, langsung ke halaman default
                      handleGradesMenuClick("nilai-asli");
                    }
                  }}
                  title={isCollapsed ? "Nilai Siswa" : ""}>
                  <div className="flex items-center gap-3">
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
                  </div>

                  {/* Dropdown arrow - hanya tampil jika tidak collapsed */}
                  {!isCollapsed && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        gradesMenuOpen ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </a>

                {/* Submenu Nilai Siswa - hanya tampil jika tidak collapsed dan dropdown open */}
                {!isCollapsed && gradesMenuOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {/* Submenu Nilai Asli */}
                    <a
                      href="#nilai-asli"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "nilai-asli"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleGradesMenuClick("nilai-asli");
                      }}
                      title="Nilai Asli">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Nilai Asli</span>
                    </a>

                    {/* Submenu Nilai Katrol */}
                    <a
                      href="#nilai-katrol"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "nilai-katrol"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleGradesMenuClick("nilai-katrol");
                      }}
                      title="Nilai Katrol">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Nilai Katrol</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* CATATAN SISWA - DISABLED SEMENTARA */}
            {/* 
{(isAdmin || (isWaliKelas && !isGuruBK)) && (
  <a
    href="#catatan-siswa"
    className={`
      flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
      touch-manipulation min-h-[44px]
      ${isCollapsed ? "justify-center" : ""}
      ${
        currentPage === "catatan-siswa"
          ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
          : "hover:text-blue-100 dark:hover:text-gray-100"
      }
    `}
    onClick={(e) => {
      e.preventDefault();
      handleMenuClick("catatan-siswa");
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
*/}

            {/* Jadwal Saya */}
            {(isAdmin ||
              (!isGuruBK &&
                (userRole === "teacher" || userRole === "homeroom"))) && (
              <a
                href="#jadwal-saya"
                className={`
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "jadwal-saya"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("jadwal-saya");
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
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "konseling"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("konseling");
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

            {/* LAPORAN - DISABLED SEMENTARA */}
            {/* 
{(isAdmin || isGuruBK || userRole === "teacher") && (
  <a
    href="#reports"
    className={`
      flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
      touch-manipulation min-h-[44px]
      ${isCollapsed ? "justify-center" : ""}
      ${
        currentPage === "reports"
          ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
          : "hover:text-blue-100 dark:hover:text-gray-100"
      }
    `}
    onClick={(e) => {
      e.preventDefault();
      handleMenuClick("reports");
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
    {!isCollapsed && (
      <span className="flex-1 text-sm">Laporan</span>
    )}
  </a>
)}
*/}
          </div>

          {/* E-RAPORT - KATEGORI BARU */}
          {/* ✅ TAMBAH CONDITIONAL RENDERING DI SINI */}
          {eraportActive && (
            <div className="mb-4 sm:mb-5">
              {!isCollapsed && (
                <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                  E-RAPORT
                </div>
              )}

              {/* Dashboard E-RAPORT */}
              <a
                href="#era-dashboard"
                className={`
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "era-dashboard-admin" ||
                    currentPage === "era-dashboard-teacher" ||
                    currentPage === "era-dashboard-homeroom"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  // Dashboard berdasarkan role
                  if (isAdmin) {
                    handleEraMenuClick("era-dashboard-admin");
                  } else if (userRole === "teacher") {
                    handleEraMenuClick("era-dashboard-teacher");
                  } else if (isWaliKelas) {
                    handleEraMenuClick("era-dashboard-homeroom");
                  } else {
                    handleEraMenuClick("era-dashboard-admin");
                  }
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
                {!isCollapsed && (
                  <span className="flex-1 text-sm">Dashboard</span>
                )}
              </a>

              {/* Input Data dengan Submenu */}
              <div className="mb-1">
                <a
                  href="#era-input-data"
                  className={`
                    flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                    touch-manipulation min-h-[44px]
                    ${isCollapsed ? "justify-center" : ""}
                    ${
                      currentPage === "era-input-tp" ||
                      currentPage === "era-input-nilai" ||
                      currentPage === "era-input-kehadiran" ||
                      currentPage === "era-input-catatan"
                        ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                        : "hover:text-blue-100 dark:hover:text-gray-100"
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isCollapsed) {
                      setInputDataOpen(!inputDataOpen);
                    } else {
                      // Jika collapsed, langsung ke halaman default
                      handleEraMenuClick("era-input-tp");
                    }
                  }}
                  title={isCollapsed ? "Input Data" : ""}>
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {!isCollapsed && (
                      <span className="flex-1 text-sm">Input Data</span>
                    )}
                  </div>

                  {/* Dropdown arrow - hanya tampil jika tidak collapsed */}
                  {!isCollapsed && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        inputDataOpen ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </a>

                {/* Submenu Input Data - hanya tampil jika tidak collapsed dan dropdown open */}
                {!isCollapsed && inputDataOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {/* Input TP */}
                    <a
                      href="#era-input-tp"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-input-tp"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-input-tp");
                      }}
                      title="Input TP">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Input TP</span>
                    </a>

                    {/* Input Nilai */}
                    <a
                      href="#era-input-nilai"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-input-nilai"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-input-nilai");
                      }}
                      title="Input Nilai">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Input Nilai</span>
                    </a>

                    {/* Input Kehadiran */}
                    <a
                      href="#era-input-kehadiran"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-input-kehadiran"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-input-kehadiran");
                      }}
                      title="Input Kehadiran">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Input Kehadiran</span>
                    </a>

                    {/* Input Catatan */}
                    <a
                      href="#era-input-catatan"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-input-catatan"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-input-catatan");
                      }}
                      title="Input Catatan">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Input Catatan</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Cetak Nilai dengan Submenu */}
              <div className="mb-1">
                <a
                  href="#era-cetak-nilai"
                  className={`
                    flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                    touch-manipulation min-h-[44px]
                    ${isCollapsed ? "justify-center" : ""}
                    ${
                      currentPage === "era-cek-kelengkapan" ||
                      currentPage === "era-cetak-raport"
                        ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                        : "hover:text-blue-100 dark:hover:text-gray-100"
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isCollapsed) {
                      setCetakNilaiOpen(!cetakNilaiOpen);
                    } else {
                      // Jika collapsed, langsung ke halaman default
                      handleEraMenuClick("era-cek-kelengkapan");
                    }
                  }}
                  title={isCollapsed ? "Cetak Nilai" : ""}>
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    {!isCollapsed && (
                      <span className="flex-1 text-sm">Cetak Nilai</span>
                    )}
                  </div>

                  {/* Dropdown arrow - hanya tampil jika tidak collapsed */}
                  {!isCollapsed && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        cetakNilaiOpen ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </a>

                {/* Submenu Cetak Nilai - hanya tampil jika tidak collapsed dan dropdown open */}
                {!isCollapsed && cetakNilaiOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {/* Cek Kelengkapan */}
                    <a
                      href="#era-cek-kelengkapan"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-cek-kelengkapan"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-cek-kelengkapan");
                      }}
                      title="Cek Kelengkapan">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Cek Kelengkapan</span>
                    </a>

                    {/* Cetak Raport */}
                    <a
                      href="#era-cetak-raport"
                      className={`
                        flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                        touch-manipulation min-h-[44px]
                        ${
                          currentPage === "era-cetak-raport"
                            ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-300 dark:border-blue-400 font-semibold text-blue-100 dark:text-gray-100"
                            : "hover:text-blue-100 dark:hover:text-gray-100"
                        }
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEraMenuClick("era-cetak-raport");
                      }}
                      title="Cetak Raport">
                      <div className="w-2 h-2 rounded-full bg-blue-300 ml-1"></div>
                      <span className="flex-1 text-sm">Cetak Raport</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Settings */}
          {userRole === "admin" && (
            <div className="mb-4">
              {!isCollapsed && (
                <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                  Sistem
                </div>
              )}

              {/* SPMB */}
              <a
                href="#spmb"
                className={`
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "spmb"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("spmb");
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
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "settings"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("settings");
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
                  flex items-center gap-3 px-4 sm:px-6 py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
                  touch-manipulation min-h-[44px]
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    currentPage === "monitor-sistem"
                      ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
                      : "hover:text-blue-100 dark:hover:text-gray-100"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick("monitor-sistem");
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
        <div
          className={`mt-auto border-t ${
            isDarkMode
              ? "border-gray-800 bg-gray-800"
              : "border-blue-700 bg-blue-800"
          } p-4`}>
          <div
            className={`flex items-center gap-3 ${
              isCollapsed ? "justify-center" : ""
            }`}>
            <div
              className={`w-10 h-10 ${
                isDarkMode ? "bg-blue-700" : "bg-blue-600"
              } rounded-full flex items-center justify-center flex-shrink-0 shadow-md`}>
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-bold truncate ${
                    isDarkMode ? "text-gray-100" : "text-white"
                  }`}>
                  {fullName}
                </div>
                <div
                  className={`text-xs truncate ${
                    isDarkMode ? "text-gray-400" : "text-blue-200"
                  }`}>
                  {roleName}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
