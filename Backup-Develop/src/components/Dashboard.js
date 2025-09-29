import React, { useState, useEffect } from 'react'
import { AlertTriangle, User, School, Users, Home } from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import HomeroomTeacherDashboard from './HomeroomTeacherDashboard'
import TeacherDashboard from './TeacherDashboard'

const Dashboard = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  // Simulate brief loading for smoother transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Debug info untuk development (akan di-remove di production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Dashboard - Current User:', user)
    console.log('User Role:', user?.role)
    console.log('Teacher ID:', user?.teacher_id)
    console.log('Homeroom Class ID:', user?.homeroom_class_id)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-blue-600 font-medium text-sm sm:text-base">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  // Route berdasarkan role dan data user
  const userRole = user?.role?.toLowerCase()
  
  // Admin Dashboard
  if (userRole === 'admin') {
    return <AdminDashboard user={user} />
  }
  
  // Teacher Dashboards
  if (userRole === 'teacher') {
    // Jika ada homeroom_class_id, berarti wali kelas
    if (user?.homeroom_class_id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Routing to HomeroomTeacherDashboard (teacher with homeroom)')
      }
      return <HomeroomTeacherDashboard user={user} />
    } else {
      // Jika tidak ada homeroom_class_id, berarti guru mapel biasa
      if (process.env.NODE_ENV === 'development') {
        console.log('Routing to TeacherDashboard (regular teacher)')
      }
      return <TeacherDashboard user={user} />
    }
  }
  
  // Legacy role homeroom_teacher (jika masih ada)
  if (userRole === 'homeroom_teacher') {
    return <HomeroomTeacherDashboard user={user} />
  }
  
  // Role tidak dikenali - Mobile-responsive error page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-3 sm:p-4 lg:p-6">
      <div className="max-w-2xl sm:max-w-4xl mx-auto">
        {/* Error Card - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-4 sm:p-6 text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Role Tidak Dikenali
            </h3>
            <p className="text-red-600 text-sm sm:text-base">
              Role "{user?.role}" tidak memiliki dashboard yang sesuai
            </p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {/* User Info - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <User size={16} className="text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-blue-800 text-sm sm:text-base">User Info</span>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-blue-700">
                  <p><span className="font-medium">Username:</span> {user?.username || 'N/A'}</p>
                  <p><span className="font-medium">Name:</span> {user?.full_name || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <School size={16} className="text-gray-600 flex-shrink-0" />
                  <span className="font-medium text-gray-800 text-sm sm:text-base">Role Info</span>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                  <p><span className="font-medium">Role:</span> {user?.role || 'N/A'}</p>
                  <p><span className="font-medium">Teacher ID:</span> {user?.teacher_id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Class Info - Only if exists */}
            {user?.homeroom_class_id && (
              <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-100 mb-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <Home size={16} className="text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-emerald-800 text-sm sm:text-base">Class Assignment</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-700">
                  <span className="font-medium">Homeroom Class:</span> {user.homeroom_class_id}
                </p>
              </div>
            )}

            {/* Routing Logic Info */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Users size={16} className="text-blue-600 flex-shrink-0" />
                  <span className="font-semibold text-blue-800 text-sm sm:text-base">Routing Logic</span>
                </div>
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  {debugMode ? 'Hide' : 'Show'} Details
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <div>
                    <span className="font-medium">admin</span>
                    <span className="text-blue-500"> → AdminDashboard</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <div>
                    <span className="font-medium">teacher + homeroom</span>
                    <span className="text-blue-500"> → HomeroomDashboard</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <div>
                    <span className="font-medium">teacher (no homeroom)</span>
                    <span className="text-blue-500"> → TeacherDashboard</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <div>
                    <span className="font-medium">"{user?.role}"</span>
                    <span className="text-red-500"> → Error</span>
                  </div>
                </div>
              </div>

              {/* Debug Details - Collapsible */}
              {debugMode && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <div className="bg-white rounded p-2 sm:p-3 text-xs font-mono text-gray-600 overflow-x-auto">
                    <div className="whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          username: user?.username,
                          role: user?.role,
                          teacher_id: user?.teacher_id,
                          homeroom_class_id: user?.homeroom_class_id,
                          full_name: user?.full_name,
                        },
                        null,
                        2
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Mobile Stacked */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
              >
                Refresh Dashboard
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin logout?')) {
                    // Trigger logout callback if available
                    window.location.href = '/login'
                  }
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
              >
                Logout & Login Ulang
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                Hubungi administrator sistem jika masalah terus berlanjut
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Error ID: ROLE_NOT_RECOGNIZED_{Date.now()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard