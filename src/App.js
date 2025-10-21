import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';

// Import pages dari folder pages
import Teachers from './pages/Teachers';
import EasyModul from './pages/EasyModul';  
import Classes from './pages/Classes';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import TeacherSchedule from './pages/TeacherSchedule';
import CatatanPerkembangan from './pages/CatatanPerkembangan';
import Setting from './setting/setting';

// Import dari folder khusus
import Konseling from './konseling/Konseling';
import Reports from './reports/Reports';
import SPMB from './spmb/SPMB';

function App() {
  const [user, setUser] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  // CHECK localStorage saat app load - RESTORE USER KALAU ADA
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('User restored from localStorage');
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Auto hide toast setelah 3 detik
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handler Login - SELALU SIMPAN ke localStorage
  const handleLogin = useCallback((userData, rememberMe = false) => {
    setUser(userData);
    
    // SELALU simpan ke localStorage supaya refresh tetap login
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Kalau rememberMe TRUE, set flag tambahan
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      console.log('Remember Me enabled - will persist after browser close');
    } else {
      localStorage.setItem('rememberMe', 'false');
      console.log('Remember Me disabled - will logout after browser close');
    }
    
    setToastMessage(`Selamat datang, ${userData.full_name}! 👋`);
    setToastType('success');
    setShowToast(true);
    console.log('User logged in:', userData);
  }, []);

  // Handler Logout + HAPUS dari localStorage
  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    setToastMessage('Logout berhasil! 👋');
    setToastType('info');
    setShowToast(true);
    console.log('User logged out and storage cleared');
  }, []);

  const handleShowToast = useCallback((message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    console.log(`Toast (${type}):`, message);
  }, []);

  // Toast styles berdasarkan type
  const getToastStyle = () => {
    const baseStyle = "fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform";
    
    switch (toastType) {
      case 'success':
        return `${baseStyle} bg-green-500`;
      case 'error':
        return `${baseStyle} bg-red-500`;
      case 'warning':
        return `${baseStyle} bg-yellow-500`;
      default:
        return `${baseStyle} bg-blue-500`;
    }
  };

  // Protected Route
  const ProtectedRoute = useCallback(({ children }) => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      );
    }
    
    if (!user) {
      return <Navigate to="/" />;
    }
    return children;
  }, [user, loading]);

  // Layout Wrapper
  const LayoutWrapper = useCallback(({ children }) => (
    <Layout user={user} onLogout={handleLogout}>
      {children}
    </Layout>
  ), [user, handleLogout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {/* TOAST HANYA MUNCUL 3 DETIK SAJA */}
      {showToast && (
        <div className={getToastStyle()}>
          <div className="flex items-center gap-2">
            {toastType === 'success' && <span className="text-lg">✅</span>}
            {toastType === 'error' && <span className="text-lg">❌</span>}
            {toastType === 'warning' && <span className="text-lg">⚠️</span>}
            {toastType === 'info' && <span className="text-lg">ℹ️</span>}
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      
      <Routes>
        {/* Public Route - Login */}
        <Route 
          path="/" 
          element={
            user ? 
            <Navigate to="/dashboard" replace /> : 
            <Login onLogin={handleLogin} onShowToast={handleShowToast} />
          } 
        />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Dashboard user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/teachers" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Teachers user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        
        <Route path="/easymodul" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <EasyModul user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/classes" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Classes user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/students" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Students user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Attendance user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/grades" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Grades user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/jadwal-saya" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <TeacherSchedule user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/catatan-perkembangan" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <CatatanPerkembangan user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/konseling" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Konseling user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Reports user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/spmb" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <SPMB user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Setting user={user} onShowToast={handleShowToast} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        {/* Catch-all route untuk redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;