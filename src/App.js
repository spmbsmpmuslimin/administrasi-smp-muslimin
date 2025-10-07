import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import Setting from './setting/setting';

// Import dari folder khusus
import Konseling from './konseling/Konseling'; // <- dari folder konseling
import Reports from './reports/Reports';       // dari folder reports
import SPMB from './spmb/SPMB';               // dari folder spmb

function App() {
  const [user, setUser] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showToast, setShowToast] = useState(false);

  // ✅ Auto hide toast setelah 3 detik
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ✅ Memoize handlers untuk prevent re-creation
  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setToastMessage('Login berhasil!');
    setToastType('success');
    setShowToast(true);
    console.log('User logged in:', userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setToastMessage('Logout berhasil!');
    setToastType('info');
    setShowToast(true);
    console.log('User logged out');
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

  // ✅ Extract ProtectedRoute keluar (stable reference)
  const ProtectedRoute = useCallback(({ children }) => {
    if (!user) {
      return <Navigate to="/" />;
    }
    return children;
  }, [user]);

  // ✅ LayoutWrapper sederhana
  const LayoutWrapper = useCallback(({ children }) => (
    <Layout user={user} onLogout={handleLogout}>
      {children}
    </Layout>
  ), [user, handleLogout]);

  return (
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {/* ✅ TOAST HANYA MUNCUL 3 DETIK SAJA */}
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

        {/* ✅ BARU: Route Konseling - Khusus untuk Guru BK */}
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