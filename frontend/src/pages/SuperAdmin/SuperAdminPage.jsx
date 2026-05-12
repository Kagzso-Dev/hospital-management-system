import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminLogin, getSuperadminTenants, createTenant, updateTenantStatus, updateTenantPassword } from '../../api';

/* ── Shared dark background ── */
function PageWrap({ children }) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2d1b4e 50%, #0f172a 100%)' }}
    >
      {children}
    </div>
  );
}

/* ── Login ── */
function LoginView({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await superadminLogin(form);
      localStorage.setItem('superadmin_token', res.data.token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrap>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-8 pt-6 pb-6 text-center relative">
              <button onClick={() => navigate('/login')}
                className="absolute top-4 left-4 flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 mt-2">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Superadmin</h1>
              <p className="text-purple-100 text-sm mt-0.5">Manage all hospital tenants</p>
            </div>

            {/* Form */}
            <div className="px-8 py-7">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1.5">Username</label>
                  <input type="text" required autoFocus value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="superadmin"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition text-sm" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} required value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition text-sm" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-sm transition disabled:opacity-60 shadow-lg active:scale-[0.98]">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

/* ── Create Tenant Modal ── */
function CreateTenantModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await createTenant(form);
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">New Tenant</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Hospital Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Apollo Hospital"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">
              Username <span className="text-gray-400 font-normal">(used to login)</span>
            </label>
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="apollo_hospital"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 4 characters"
                className="w-full px-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPwd
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold disabled:opacity-60 transition text-sm">
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Tenant Card ── */
function TenantCard({ tenant, onStatusChange }) {
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showReset, setShowReset] = useState(false);
  const isActive = tenant.status === 'active';

  const toggleStatus = async () => {
    const next = isActive ? 'suspended' : 'active';
    try {
      await updateTenantStatus(tenant.id, next);
      onStatusChange(tenant.id, next);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleReset = async () => {
    if (!newPwd || newPwd.length < 4) return alert('Password must be at least 4 characters');
    setResetting(true);
    try {
      await updateTenantPassword(tenant.id, newPwd);
      setShowReset(false);
      setNewPwd('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">#{tenant.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {tenant.status}
            </span>
          </div>
          <h3 className="text-gray-900 font-bold text-base truncate">{tenant.name}</h3>
          <p className="text-purple-600 text-sm font-mono mt-0.5">@{tenant.username}</p>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {tenant.doctor_count} doctors
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {tenant.patient_count} patients
            </span>
            <span>{new Date(tenant.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={toggleStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}>
            {isActive ? 'Suspend' : 'Activate'}
          </button>
          <button onClick={() => setShowReset(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            Reset Pwd
          </button>
        </div>
      </div>

      {showReset && (
        <div className="mt-4 flex gap-2 pt-4 border-t border-gray-100">
          <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            placeholder="New password" type="password"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" />
          <button onClick={handleReset} disabled={resetting}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-60 transition">
            {resetting ? '...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard({ onLogout }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSuperadminTenants()
      .then((res) => setTenants(res.data))
      .catch(() => { localStorage.removeItem('superadmin_token'); onLogout(); })
      .finally(() => setLoading(false));
  }, [onLogout]);

  const handleStatusChange = (id, status) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.username.toLowerCase().includes(search.toLowerCase())
  );

  const active = tenants.filter(t => t.status === 'active').length;
  const totalDoctors = tenants.reduce((s, t) => s + (t.doctor_count || 0), 0);
  const totalPatients = tenants.reduce((s, t) => s + (t.patient_count || 0), 0);

  return (
    <PageWrap>
      <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Superadmin Dashboard</h1>
              <p className="text-white/50 text-xs sm:text-sm mt-0.5">Manage all hospital tenants</p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <button onClick={() => setShowCreate(true)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs sm:text-sm font-semibold hover:from-purple-500 hover:to-pink-400 transition shadow-lg whitespace-nowrap">
                + New Tenant
              </button>
              <button onClick={onLogout}
                className="px-3 sm:px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm hover:bg-white/20 transition whitespace-nowrap">
                Logout
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {[
              { label: 'Total Tenants', value: tenants.length, color: 'from-purple-500 to-pink-500' },
              { label: 'Active', value: active, color: 'from-green-500 to-emerald-400' },
              { label: 'Doctors', value: totalDoctors, color: 'from-blue-500 to-cyan-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 text-center">
                <div className={`text-xl sm:text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
                <div className="text-white/60 text-[10px] sm:text-xs mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:bg-white/15 transition text-sm" />
          </div>

          {/* Tenant list */}
          {loading ? (
            <div className="text-white/50 text-center py-20 text-sm">Loading tenants...</div>
          ) : filtered.length === 0 ? (
            <div className="text-white/40 text-center py-20 text-sm">
              {search ? 'No tenants match your search.' : 'No tenants yet. Create the first one.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(t => (
                <TenantCard key={t.id} tenant={t} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          <p className="text-center text-white/30 text-xs mt-6">{totalPatients} total patients across all tenants</p>
        </div>
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreate={t => setTenants(prev => [...prev, { ...t, doctor_count: 0, patient_count: 0 }])}
        />
      )}
    </PageWrap>
  );
}

/* ── Root ── */
export default function SuperAdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('superadmin_token'));
  const handleLogout = () => { localStorage.removeItem('superadmin_token'); setIsLoggedIn(false); };
  return isLoggedIn ? <Dashboard onLogout={handleLogout} /> : <LoginView onLogin={() => setIsLoggedIn(true)} />;
}
