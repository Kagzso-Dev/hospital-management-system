import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import { ToastProvider } from './components/Toast';
import HeroPage from './pages/Hero/HeroPage';
import HomePage from './pages/Home/HomePage';
import ReceptionPage from './pages/Reception/ReceptionPage';
import DoctorSelect from './pages/Doctor/DoctorSelect';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import TokenDisplay from './pages/TokenDisplay/TokenDisplay';
import AdminPage from './pages/Admin/AdminPage';
import TenantLogin from './pages/Auth/TenantLogin';
import SuperAdminPage from './pages/SuperAdmin/SuperAdminPage';

function RequireAuth({ children }) {
  const token = localStorage.getItem('tenant_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-fade-up flex-1">
      {children}
    </div>
  );
}

function AppLayout() {
  return (
    <>
      <PageLoader />
      <Routes>
        {/* Public: splash hero */}
        <Route path="/" element={<HeroPage />} />

        {/* Public: tenant login */}
        <Route path="/login" element={<TenantLogin />} />

        {/* Public: superadmin panel */}
        <Route path="/superadmin" element={<SuperAdminPage />} />

        {/* Public: token TV display (accessed by doctor_id, no login needed) */}
        <Route path="/token/:doctorId" element={<TokenDisplay />} />

        {/* Protected: all app pages */}
        <Route
          path="*"
          element={
            <RequireAuth>
              <div className="relative min-h-screen flex flex-col" style={{ overflowX: 'clip' }}>
                <div
                  className="bg-zoom fixed inset-0 -z-20"
                  style={{ backgroundImage: 'url(/back.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
                />
                <div className="fixed inset-0 -z-10 bg-black/40" />
                <Navbar />
                <PageTransition>
                  <Routes>
                    <Route path="/home"       element={<HomePage />} />
                    <Route path="/reception"  element={<ReceptionPage />} />
                    <Route path="/doctor"     element={<DoctorSelect />} />
                    <Route path="/doctor/:id" element={<DoctorDashboard />} />
                    <Route path="/admin"      element={<AdminPage />} />
                  </Routes>
                </PageTransition>
              </div>
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}
