import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Teachers from './pages/Teachers'; // ✅ UBAH
import EasyModul from './pages/EasyModul'; // ✅ UBAH  
import Classes from './pages/Classes'; // ✅ UBAH
import { Students } from './pages/Students'; // ✅ UBAH
import Attendance from './pages/Attendance'; // ✅ UBAH
import Grades from './pages/Grades'; // ✅ UBAH
import Reports from './pages/Reports'; // ✅ UBAH
import Setting from './pages/Setting'; // ✅ UBAH

function App() {
  const [user, setUser] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const handleLogin = (userData) => {
    setUser(userData)
    console.log('User logged in:', userData)
  }

  const handleLogout = () => {
    setUser(null)
    console.log('User logged out')
  }

  const handleShowToast = (message, type = 'info') => {
    setToastMessage(message)
    console.log(`Toast (${type}):`, message)
    // Auto hide toast after 3 seconds
    setTimeout(() => {
      setToastMessage('')
    }, 3000)
  }

  return (
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
        />
        
        {user && (
          <>
            {/* Dashboard Route */}
            <Route path="/dashboard" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Dashboard Component */}
                <Dashboard user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Teachers Route */}
            <Route path="/teachers" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Teachers Component */}
                <Teachers user={user} onShowToast={handleShowToast} />
              </Layout>
            } />
            
            {/* EasyModul Route */}
            <Route path="/easymodul" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* EasyModul Component */}
                <EasyModul user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Classes Route */}
            <Route path="/classes" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Classes Component */}
                <Classes user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Students Route */}
            <Route path="/students" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Students Component */}
                <Students user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Attendance Route */}
            <Route path="/attendance" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Attendance Component */}
                <Attendance user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Grades Route */}
            <Route path="/grades" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Grades Component */}
                <Grades user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Reports Route */}
            <Route path="/reports" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Reports Component */}
                <Reports user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Setting Route - TAMBAHKAN INI */}
            <Route path="/settings" element={
              <Layout user={user} onLogout={handleLogout}>
                {/* Toast Notification */}
                {toastMessage && (
                  <div className="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    {toastMessage}
                  </div>
                )}
                
                {/* Setting Component */}
                <Setting user={user} onShowToast={handleShowToast} />
              </Layout>
            } />

            {/* Tambahkan route lainnya sesuai kebutuhan */}
          </>
        )}

        {/* Catch-all route untuk redirect ke root jika path tidak cocok */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;