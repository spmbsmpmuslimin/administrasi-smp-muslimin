import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Calendar, Clock, Settings, LogOut, Menu, X, User, Home } from 'lucide-react'
import Sidebar from './Sidebar'

const Layout = ({ user, onLogout, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // State management
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Mobile-first: closed by default
  const [isNavigating, setIsNavigating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [isLaptop, setIsLaptop] = useState(false)
  
  // Refs for cleanup and outside click detection
  const timerRef = useRef(null)
  const navigationTimeoutRef = useRef(null)
  const profileDropdownRef = useRef(null)

  // Detect screen size and adjust sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isLaptopSize = window.innerWidth >= 1024
      setIsLaptop(isLaptopSize)
      
      // Auto-open sidebar on laptop, auto-close on mobile/tablet
      if (isLaptopSize) {
        setIsSidebarOpen(true)
        setMobileMenuOpen(false)
      } else {
        setIsSidebarOpen(false)
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update clock every second with proper cleanup
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date())

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(updateTime, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  // Reset navigation state when location changes
  useEffect(() => {
    if (isNavigating) {
      setIsNavigating(false)
    }
    setMobileMenuOpen(false)
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }
  }, [location.pathname])

  // Format date for display (Indonesian)
  const formatDate = (date) => {
    const options = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
    return date.toLocaleDateString('id-ID', options)
  }

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get current page from URL
  const getCurrentPage = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'dashboard'
    if (path === '/teachers') return 'teachers'
    if (path === '/students') return 'students'
    if (path === '/classes') return 'classes'
    if (path === '/attendance') return 'attendance'
    if (path === '/grades') return 'grades'
    if (path === '/reports') return 'reports'
    if (path === '/easymodul') return 'easymodul'
    if (path === '/settings') return 'settings'
    return 'dashboard'
  }

  // Get current page name for display
  const getCurrentPageName = () => {
    const pathMap = {
      '/dashboard': 'Dashboard',
      '/students': 'Data Siswa',
      '/teachers': 'Data Guru',
      '/classes': 'Data Kelas',
      '/attendance': 'Kehadiran',
      '/grades': 'Nilai Akademik',
      '/reports': 'Laporan',
      '/easymodul': 'EasyModul',
      '/settings': 'Pengaturan',
    }
    return pathMap[location.pathname] || 'Dashboard'
  }

  // Get page subtitle based on role and current page
  const getPageSubtitle = () => {
    if (!user) return 'SMP Muslimin'
    
    const { role, homeroom_class_id } = user
    const currentPage = getCurrentPageName()

    const subtitles = {
      admin: {
        Dashboard: 'Kelola Semua Data Sekolah',
        'Data Siswa': 'Kelola Data Siswa Sekolah',
        'Data Guru': 'Kelola Data Guru Sekolah',
        'Data Kelas': 'Kelola Data Kelas Sekolah',
        Kehadiran: 'Kelola Kehadiran Siswa',
        'Nilai Akademik': 'Kelola Nilai Akademik Siswa',
        Laporan: 'Generate dan Kelola Laporan',
        EasyModul: 'Kelola Modul Pembelajaran',
        Pengaturan: 'Pengaturan Sistem Sekolah',
      },
      teacher: homeroom_class_id ? {
        // Homeroom Teacher - Format asli yang lebih spesifik
        Dashboard: `Kelola Data Kelas ${homeroom_class_id}`,
        'Data Siswa': `Kelola Data Siswa Kelas ${homeroom_class_id}`,
        'Data Guru': 'Kelola Data Guru Sekolah',
        'Data Kelas': `Informasi Kelas ${homeroom_class_id}`,
        Kehadiran: `Input kehadiran Kelas ${homeroom_class_id}`,
        'Nilai Akademik': `Input Nilai Kelas ${homeroom_class_id}`,
        Laporan: `Laporan Kelas ${homeroom_class_id}`,
        EasyModul: 'Akses Modul Pembelajaran',
        Pengaturan: 'Pengaturan Akun',
      } : {
        // Subject Teacher - Format asli
        Dashboard: 'Monitor semua kelas yang diampu',
        'Data Siswa': 'Lihat data siswa semua kelas',
        'Data Guru': 'Lihat data guru sekolah',
        'Data Kelas': 'Lihat informasi kelas',
        Kehadiran: 'Input kehadiran mata pelajaran',
        'Nilai Akademik': 'Input nilai mata pelajaran',
        Laporan: 'Laporan mata pelajaran',
        EasyModul: 'Akses modul pembelajaran',
        Pengaturan: 'Pengaturan akun',
      }
    }

    return subtitles[role]?.[currentPage] || 'SMP Muslimin'
  }

  // Enhanced navigation handler with debouncing
  const handleNavigate = useCallback((page) => {
    if (isNavigating) return

    const routes = {
      'dashboard': '/dashboard',
      'teachers': '/teachers',
      'students': '/students',
      'classes': '/classes',
      'attendance': '/attendance',
      'grades': '/grades',
      'reports': '/reports',
      'easymodul': '/easymodul',
      'settings': '/settings'
    }
    
    const path = routes[page]
    if (!path) return

    // Don't navigate if already on the same page
    if (location.pathname === path) return

    setIsNavigating(true)

    try {
      navigate(path)
      
      // Safety timeout to reset navigation state
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false)
      }, 2000)
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }, [isNavigating, location.pathname, navigate])

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen)
  }

  // Get user role display
  const getUserRoleDisplay = () => {
    if (!user) return 'User'
    const { role, homeroom_class_id } = user
    
    if (role === 'admin') return 'Admin'
    if (role === 'teacher' && homeroom_class_id) return `Wali ${homeroom_class_id}`
    if (role === 'teacher') return 'Guru'
    return 'User'
  }

  const currentPageName = getCurrentPageName()

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Laptop/Desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 ${isSidebarOpen ? 'w-60' : 'w-0'} transition-all duration-300 hidden lg:block`}>
        <Sidebar 
          currentPage={getCurrentPage()}
          onNavigate={handleNavigate}
          isOpen={isSidebarOpen}
          userRole={user?.role}
        />
      </div>

      {/* Sidebar - Mobile/Tablet */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:hidden`}>
        <Sidebar 
          currentPage={getCurrentPage()}
          onNavigate={handleNavigate}
          isOpen={true}
          userRole={user?.role}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
      
      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${isSidebarOpen && isLaptop ? 'lg:ml-60' : 'ml-0'}`}>
        
        {/* Mobile-First Header */}
        <header className="bg-white shadow-md shadow-blue-100/50 border-b border-blue-100 sticky top-0 z-30">
          {/* Mobile Header (Base Design) */}
          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4">
            <div className="flex justify-between items-center">
              {/* Left Side - Mobile Optimized */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                {/* Menu Button */}
                <button
                  onClick={isLaptop ? () => setIsSidebarOpen(!isSidebarOpen) : toggleMobileMenu}
                  className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors touch-manipulation"
                  style={{ minWidth: '44px', minHeight: '44px' }} // Touch-friendly
                >
                  {isSidebarOpen && isLaptop ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Page Info - Mobile First */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                      {currentPageName}
                    </h1>
                    {isNavigating && (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium truncate lg:block">
                    {getPageSubtitle()}
                  </p>
                </div>
              </div>

              {/* Right Side - Mobile Optimized */}
              <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
                {/* Compact Time Display - Mobile */}
                <div className="lg:hidden flex flex-col items-center min-w-[60px]">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                  <span className="text-xs text-blue-500 font-medium">
                    {formatDate(currentTime)}
                  </span>
                </div>

                {/* Full Clock - Laptop */}
                <div className="hidden lg:flex bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl px-4 py-3 min-w-[280px] shadow-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-1">
                      <Calendar size={16} className="text-blue-500 flex-shrink-0" />
                      <span>{currentTime.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-500 flex-shrink-0" />
                      <span className="font-mono font-semibold text-gray-900 text-base tracking-wide">
                        {currentTime.toLocaleTimeString('id-ID')}
                      </span>
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded ml-1">
                        WIB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Dropdown - Touch Optimized */}
                <div className="relative" ref={profileDropdownRef}>
                  <button 
                    onClick={toggleProfileDropdown}
                    className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 bg-blue-600 flex items-center gap-1 sm:gap-2 touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <User size={16} className="text-white flex-shrink-0" />
                    <span className="hidden sm:block text-sm font-medium text-white">
                      Profile
                    </span>
                  </button>
                  
                  {/* Mobile-Optimized Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-white border border-blue-100 rounded-xl shadow-lg z-50">
                      {/* User Info Header - Mobile Friendly */}
                      <div className="px-4 py-3 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-white">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {user?.full_name || user?.username || 'User'}
                        </p>
                        <p className="text-xs text-blue-600 capitalize font-medium">
                          {user?.role === 'admin' ? 'Administrator' : 
                           user?.role === 'teacher' && user?.homeroom_class_id ? `Wali Kelas ${user.homeroom_class_id}` :
                           user?.role === 'teacher' ? 'Guru Mata Pelajaran' : 'User'}
                        </p>
                        {user?.teacher_id && (
                          <p className="text-xs text-gray-500 font-medium">
                            ID: {user.teacher_id}
                          </p>
                        )}
                      </div>
                      
                      {/* Menu Items - Touch Friendly */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            handleNavigate('dashboard')
                            setProfileDropdownOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 touch-manipulation"
                        >
                          <Home size={16} className="flex-shrink-0" />
                          <span className="font-medium">Dashboard</span>
                        </button>
                        
                        {/* Pengaturan - Only for Admin */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              handleNavigate('settings')
                              setProfileDropdownOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 touch-manipulation"
                          >
                            <Settings size={16} className="flex-shrink-0" />
                            <span className="font-medium">Pengaturan</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            onLogout()
                            setProfileDropdownOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 touch-manipulation"
                        >
                          <LogOut size={16} className="flex-shrink-0" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Mobile Optimized Padding */}
        <div className="bg-gradient-to-br from-blue-50 to-white min-h-screen p-3 sm:p-4 lg:p-6">
          {isNavigating ? (
            <div className="flex items-center justify-center h-32 sm:h-48">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-blue-600 font-medium text-sm">Loading...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}

export default Layout