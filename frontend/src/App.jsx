import React, { lazy, Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import PageSuspense from './components/PageSuspense';
import { ToastProvider } from './components/Toast';

// Eagerly loaded (tiny, needed on first paint)
import TenantLogin from './pages/Auth/TenantLogin';

// Lazy-loaded pages — each becomes its own split chunk
const HeroPage        = lazy(() => import('./pages/Hero/HeroPage'));
const HomePage        = lazy(() => import('./pages/Home/HomePage'));
const ReceptionPage   = lazy(() => import('./pages/Reception/ReceptionPage'));
const DoctorSelect    = lazy(() => import('./pages/Doctor/DoctorSelect'));
const DoctorDashboard = lazy(() => import('./pages/Doctor/DoctorDashboard'));
const TokenDisplay    = lazy(() => import('./pages/TokenDisplay/TokenDisplay'));
const AdminPage       = lazy(() => import('./pages/Admin/AdminPage'));
const SuperAdminPage  = lazy(() => import('./pages/SuperAdmin/SuperAdminPage'));

/* ── Error Boundary — catches failed lazy chunk loads ── */
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  handleReload() {
    // Clear module cache and hard-reload so browser fetches fresh chunks
    window.location.reload(true);
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-white font-bold text-lg mb-2">Page failed to load</h2>
            <p className="text-white/50 text-sm mb-6">A new version may be available. Reload to get the latest.</p>
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm transition">
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth({ children }) {
  const token = sessionStorage.getItem('tenant_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireSuperAdmin({ children }) {
  const token = sessionStorage.getItem('superadmin_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  if (sessionStorage.getItem('superadmin_token')) return <Navigate to="/superadmin" replace />;
  if (sessionStorage.getItem('tenant_token')) return <Navigate to="/home" replace />;
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
      <ChunkErrorBoundary>
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
      </ChunkErrorBoundary>
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
