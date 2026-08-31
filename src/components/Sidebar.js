//[file name]: Sidebar.js
import React, { useState, useEffect } from "react";
import sekolahLogo from "../assets/logo_sekolah.png";
import { supabase } from "../supabaseClient";
import { sidebarGroups } from "../config/sidebarConfig";

// ========== Sub-komponen: 1 baris menu ==========
const MenuLink = ({ page, label, icon, isCollapsed, isActive, indent, onClick }) => (
  <a
    href={`#${page}`}
    className={`
      flex items-center gap-3 ${indent ? "px-6 sm:px-8" : "px-4 sm:px-6"} py-2.5 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-blue-800 dark:hover:bg-gray-800 rounded-r-full mr-4
      touch-manipulation min-h-[44px]
      ${isCollapsed ? "justify-center" : ""}
      ${
        isActive
          ? "bg-blue-800 dark:bg-gray-800 border-r-4 border-blue-400 dark:border-blue-500 font-semibold text-blue-100 dark:text-gray-100"
          : "hover:text-blue-100 dark:hover:text-gray-100"
      }
    `}
    onClick={(e) => {
      e.preventDefault();
      onClick(page);
    }}
    title={isCollapsed ? label : ""}
  >
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icon.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
      ))}
    </svg>
    {!isCollapsed && <span className="flex-1 text-sm">{label}</span>}
  </a>
);

// ========== Sub-komponen: header section (mis. "MASTER DATA", "Konseling", "Menu Wali Kelas") ==========
const SectionHeader = ({ text, style = "main" }) =>
  style === "sub" ? (
    <div className="px-6 sm:px-8 pb-1 pt-2">
      <div className="text-xs uppercase font-semibold text-blue-200 dark:text-gray-500 tracking-wider">
        {text}
      </div>
    </div>
  ) : (
    <div className="mt-4 sm:mt-5 mb-1 px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
      {text}
    </div>
  );

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
  const [eraportActive, setEraportActive] = useState(true);

  useEffect(() => {
    setIsDarkMode(darkMode);
  }, [darkMode]);

  // ✅ FETCH E-RAPORT STATUS
  useEffect(() => {
    const fetchEraportStatus = async () => {
      try {
        const { data } = await supabase.from("eraport_settings").select("is_active").single();
        setEraportActive(data?.is_active ?? true);
      } catch (error) {
        console.error("Error fetching eraport status:", error);
        setEraportActive(true);
      }
    };

    fetchEraportStatus();

    const channel = supabase
      .channel("eraport-toggle")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "eraport_settings" },
        (payload) => setEraportActive(payload.new.is_active)
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

  // ⭐ ctx dipakai semua show()/label()/page() function di sidebarConfig.js
  const ctx = { isAdmin, isTeacher, isGuruBK, isWaliKelas, userRole, eraportActive };

  return (
    <div className={`h-screen transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
      <div
        className={`
        h-full transition-all duration-300 flex flex-col
        ${isCollapsed ? "w-20" : "w-64"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        sm:translate-x-0 sm:relative
        bg-blue-900 dark:bg-gray-900 text-white border-r border-blue-800 dark:border-gray-800
        overflow-y-auto
      `}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-blue-700 dark:border-gray-800">
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 p-2 text-blue-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div
              className={`${
                isCollapsed ? "w-10 h-10" : "w-10 h-10 sm:w-12 sm:h-12"
              } bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden shadow-lg`}
            >
              <img
                src={sekolahLogo}
                alt="Logo SMP Muslimin Cililin"
                className="w-full h-full object-cover"
              />
            </div>

            {!isCollapsed && (
              <div>
                <div className="text-base font-bold text-white dark:text-gray-100 leading-tight">
                  SMP MUSLIMIN
                </div>
                <div className="text-base font-bold text-white dark:text-gray-100 leading-tight">
                  CILILIN
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========== NAVIGATION (generated dari sidebarConfig.js) ========== */}
        <nav className="py-4 flex-1">
          {sidebarGroups.map((group) => {
            const groupVisible = group.show ? group.show(ctx) : true;
            if (!groupVisible) return null;

            // Filter item yang lolos show() dulu, biar tau apakah grup ini
            // akhirnya kosong (kalau kosong, jangan render header-nya).
            const visibleItems = group.items.filter((item) => (item.show ? item.show(ctx) : true));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="mb-4 sm:mb-5">
                {group.title && !isCollapsed && (
                  <div className="px-4 sm:px-6 pb-2 text-xs uppercase font-semibold text-blue-300 dark:text-gray-400 tracking-wider">
                    {group.title}
                  </div>
                )}

                {visibleItems.map((item) => {
                  const resolvedPage = typeof item.page === "function" ? item.page(ctx) : item.page;
                  const label = typeof item.label === "function" ? item.label(ctx) : item.label;
                  const isActive = item.highlightPages
                    ? item.highlightPages.includes(currentPage)
                    : currentPage === resolvedPage;

                  return (
                    <React.Fragment key={resolvedPage}>
                      {item.sectionHeader && !isCollapsed && (
                        <SectionHeader text={item.sectionHeader} style={item.sectionHeaderStyle} />
                      )}
                      <MenuLink
                        page={resolvedPage}
                        label={label}
                        icon={item.icon}
                        isCollapsed={isCollapsed}
                        isActive={isActive}
                        indent={item.indent}
                        onClick={handleMenuClick}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div
          className={`mt-auto border-t ${
            isDarkMode ? "border-gray-800 bg-gray-800" : "border-blue-700 bg-blue-800"
          } p-4`}
        >
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div
              className={`w-10 h-10 ${
                isDarkMode ? "bg-blue-700" : "bg-blue-600"
              } rounded-full flex items-center justify-center flex-shrink-0 shadow-md`}
            >
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-bold truncate ${
                    isDarkMode ? "text-gray-100" : "text-white"
                  }`}
                >
                  {fullName}
                </div>
                <div
                  className={`text-xs truncate ${isDarkMode ? "text-gray-400" : "text-blue-200"}`}
                >
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
