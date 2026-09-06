//[file name]: Sidebar.js
import React, { useState, useEffect } from "react";
import { Database, BookOpen, BarChart3, CalendarClock, Library, Settings } from "lucide-react";
import sekolahLogo from "../assets/logo_sekolah.png";
import { supabase } from "../supabaseClient";
import { sidebarGroups } from "../config/sidebarConfig";

// ⭐ Icon per kategori (group.id di sidebarConfig.js) -- cuma buat header
// grup, gak ada hubungannya sama icon tiap menu item (yang udah ada
// sendiri-sendiri di sidebarConfig.js).
const GROUP_ICONS = {
  "master-data": Database,
  akademik: BookOpen,
  eraport: BarChart3,
  kurikulum: CalendarClock,
  perpustakaan: Library,
  sistem: Settings,
};

// ⭐ Aksen warna kategori -- disamain semua pakai emerald (hijau) biar
// konsisten satu warna di seluruh sidebar, gak beda-beda per grup lagi.
const GROUP_ACCENTS = {};
const DEFAULT_ACCENT = {
  badge: "bg-emerald-500",
  iconText: "text-emerald-50",
  active: "from-emerald-600/90 to-emerald-700/40",
  activeBorder: "border-emerald-400",
  card: "bg-emerald-500/[0.07]",
  itemIcon: "bg-emerald-400/20 text-emerald-200",
};

// ========== Sub-komponen: 1 baris menu ==========
const MenuLink = ({ page, label, icon, isCollapsed, isActive, indent, onClick, accent }) => (
  <a
    href={`#${page}`}
    className={`
      relative flex items-center gap-3 ${indent ? "px-6 sm:px-8 ml-2" : "px-4 sm:px-6"} py-2 text-white dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer hover:bg-white/10 dark:hover:bg-gray-800 rounded-r-full mr-4
      touch-manipulation min-h-[38px]
      ${isCollapsed ? "justify-center" : ""}
      ${indent ? "border-l-2 border-white/10" : ""}
      ${
        isActive
          ? `bg-gradient-to-r ${accent.active} border-l-4 ${accent.activeBorder} font-semibold text-white shadow-sm`
          : "hover:text-white hover:translate-x-0.5"
      }
    `}
    onClick={(e) => {
      e.preventDefault();
      onClick(page);
    }}
    title={isCollapsed ? label : ""}
  >
    <span
      className={`flex items-center justify-center flex-shrink-0 rounded-lg ${
        indent ? "w-6 h-6" : "w-7 h-7"
      } ${isActive ? "bg-white/20" : accent.itemIcon}`}
    >
      <svg
        className={indent ? "w-3.5 h-3.5" : "w-4 h-4"}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icon.map((d, i) => (
          <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
        ))}
      </svg>
    </span>
    {!isCollapsed && (
      <span className={`flex-1 ${indent ? "text-[13px] text-white/85" : "text-sm"}`}>{label}</span>
    )}
  </a>
);

// ========== Sub-komponen: header section (mis. "MASTER DATA", "Konseling", "Menu Wali Kelas") ==========
const SectionHeader = ({ text, style = "main", accent }) =>
  style === "sub" ? (
    <div className="px-6 sm:px-8 pb-0.5 pt-1.5 ml-2">
      <div
        className="flex items-center gap-1.5 text-[11px] uppercase font-semibold italic text-white/70 tracking-wider border-l-2 pl-2"
        style={{ borderColor: "rgba(255,255,255,0.25)" }}
      >
        {text}
      </div>
    </div>
  ) : (
    <div className="mt-1 mb-1 px-4 sm:px-6 pb-1">
      <span
        className={`inline-block text-[11px] uppercase font-bold text-white tracking-wider ${accent.badge} px-2.5 py-0.5 rounded-full shadow-sm`}
      >
        {text}
      </span>
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

  // ✅ FIX: normalisasi role sebelum dibandingin -- kalau value role dari
  // database ada spasi nyelip atau beda casing (mis. "Guru_BK", " guru_bk"),
  // perbandingan `=== "guru_bk"` gagal match diam-diam dan bikin menu
  // "Jadwal Mengajar" / "Jurnal Mengajar" ilang dari sidebar Guru BK/BP
  // walau role-nya sebenarnya udah bener.
  const normalizedRole = typeof userRole === "string" ? userRole.trim().toLowerCase() : userRole;

  const isGuruBK = normalizedRole === "guru_bk";
  const isAdmin = normalizedRole === "admin";
  const isTeacher = normalizedRole === "teacher";
  // ✅ TU (Tata Usaha): role tetap "tu" di database (BUKAN "admin") supaya
  // tetap kehitung sebagai staff di daftar "Data Guru & Staff", tapi diksh
  // akses sidebar selevel Admin.
  const isTU = normalizedRole === "tu";
  // ⭐ Wakasek Kurikulum: bukan role, tapi jabatan struktural tambahan di
  // tabel users (kolom jabatan_struktural). Guru biasa yang juga menjabat
  // wakasek tetap punya role "teacher", jadi ini flag terpisah dari role.
  const isWakasekKurikulum = userData.jabatan_struktural === "wakasek_kurikulum";

  const fullName = userData.full_name || "User";
  const roleName =
    normalizedRole === "admin"
      ? "Administrator"
      : normalizedRole === "guru_bk"
        ? "Guru BK"
        : isWaliKelas
          ? `Wali Kelas ${userData.homeroom_class_name || ""}`
          : normalizedRole === "teacher"
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
  const ctx = {
    isAdmin,
    isTeacher,
    isGuruBK,
    isTU,
    isWaliKelas,
    isWakasekKurikulum,
    userRole: normalizedRole,
    eraportActive,
  };

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
        <nav className="py-2 flex-1">
          {sidebarGroups.map((group) => {
            const groupVisible = group.show ? group.show(ctx) : true;
            if (!groupVisible) return null;

            // Filter item yang lolos show() dulu, biar tau apakah grup ini
            // akhirnya kosong (kalau kosong, jangan render header-nya).
            const visibleItems = group.items.filter((item) => (item.show ? item.show(ctx) : true));
            if (visibleItems.length === 0) return null;

            const accent = GROUP_ACCENTS[group.id] || DEFAULT_ACCENT;

            return (
              <div
                key={group.id}
                className={`mb-2.5 sm:mb-3 mx-2 rounded-xl py-1 ${group.title ? accent.card : ""}`}
              >
                {group.title &&
                  !isCollapsed &&
                  (() => {
                    const GroupIcon = GROUP_ICONS[group.id];
                    return (
                      <div className="flex items-center gap-2 px-4 pt-2 pb-2 mb-1">
                        {GroupIcon && (
                          <span
                            className={`flex items-center justify-center w-5 h-5 rounded-full ${accent.badge} flex-shrink-0 shadow-sm`}
                          >
                            <GroupIcon className={`w-3 h-3 ${accent.iconText}`} />
                          </span>
                        )}
                        <span className="text-[11px] font-extrabold uppercase text-white tracking-widest">
                          {group.title}
                        </span>
                      </div>
                    );
                  })()}

                {visibleItems.map((item) => {
                  const resolvedPage = typeof item.page === "function" ? item.page(ctx) : item.page;
                  const label = typeof item.label === "function" ? item.label(ctx) : item.label;
                  const isActive = item.highlightPages
                    ? item.highlightPages.includes(currentPage)
                    : currentPage === resolvedPage;

                  return (
                    <React.Fragment key={resolvedPage}>
                      {item.sectionHeader && !isCollapsed && (
                        <SectionHeader
                          text={item.sectionHeader}
                          style={item.sectionHeaderStyle}
                          accent={accent}
                        />
                      )}
                      <MenuLink
                        page={resolvedPage}
                        label={label}
                        icon={item.icon}
                        isCollapsed={isCollapsed}
                        isActive={isActive}
                        indent={item.indent}
                        onClick={handleMenuClick}
                        accent={accent}
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
