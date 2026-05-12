import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import PageSuspense from './components/PageSuspense';
import { ToastProvider } from './components/Toast';

// Eagerly loaded (tiny, needed on first paint)
import TenantLogin from './pages/Auth/TenantLogin';

// Lazy-loaded pages — each becomes its own split chunk
const HeroPage         = lazy(() => import('./pages/Hero/HeroPage'));
const HomePage         = lazy(() => import('./pages/Home/HomePage'));
const ReceptionPage    = lazy(() => import('./pages/Reception/ReceptionPage'));
const DoctorSelect     = lazy(() => import('./pages/Doctor/DoctorSelect'));
const DoctorDashboard  = lazy(() => import('./pages/Doctor/DoctorDashboard'));
const TokenDisplay     = lazy(() => import('./pages/TokenDisplay/TokenDisplay'));
const AdminPage        = lazy(() => import('./pages/Admin/AdminPage'));
const SuperAdminPage   = lazy(() => import('./pages/SuperAdmin/SuperAdminPage'));

function RequireAuth({ children }) {
  const token = localStorage.getItem('tenant_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireSuperAdmin({ children }) {
  const token = localStorage.getItem('superadmin_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  if (localStorage.getItem('superadmin_token')) return <Navigate to="/superadmin" replace />;
  if (localStorage.getItem('tenant_token')) return <Navigate to="/home" replace />;
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
      <Suspense fallback={<PageSuspense />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RedirectIfAuth><HeroPage /></RedirectIfAuth>} />
          <Route path="/login" element={<RedirectIfAuth><TenantLogin /></RedirectIfAuth>} />

          {/* Superadmin */}
          <Route path="/superadmin" element={<RequireSuperAdmin><SuperAdminPage /></RequireSuperAdmin>} />

          {/* Token TV display — no login needed */}
          <Route path="/token/:doctorId" element={<TokenDisplay />} />

          {/* Protected app pages */}
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
      </Suspense>
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
