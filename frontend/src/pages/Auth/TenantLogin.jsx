import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { tenantLogin, superadminLogin } from '../../api';

export default function TenantLogin() {
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
      const res = await tenantLogin(form);
      const token = res.data.token;
      sessionStorage.setItem('tenant_token', token);
      sessionStorage.setItem('tenant_info', JSON.stringify(res.data.tenant));
      try {
        const s = await axios.get('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
        if (s.data.hospital_name)    localStorage.setItem('hospital_name',              s.data.hospital_name);
        if (s.data.hospital_tagline !== undefined) localStorage.setItem('hospital_tagline', s.data.hospital_tagline || '');
        localStorage.setItem('procedure_charge_enabled', String(!!s.data.procedure_charge_enabled));
      } catch {}
      navigate('/home', { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        try {
          const saRes = await superadminLogin(form);
          sessionStorage.setItem('superadmin_token', saRes.data.token);
          navigate('/superadmin', { replace: true });
          return;
        } catch {
          // fall through
        }
      }
      setError(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background */}
      <div className="bg-zoom fixed inset-0 -z-20" style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/95 via-blue-950/93 to-slate-950/96" />

      <div className="w-full max-w-sm">
        {/* Glass card */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl bg-white/8">

          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 text-center border-b border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.45) 0%, rgba(6,182,212,0.35) 100%)' }}>
            <button
              onClick={() => navigate('/')}
              className="absolute left-4 top-4 text-white/50 hover:text-white transition-colors"
              title="Go Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Hospital Login</h1>
            <p className="text-blue-200/70 text-sm mt-0.5">Sign in to your hospital account</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-white/70 text-sm font-semibold mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-transparent focus:bg-white/15 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-semibold mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-transparent focus:bg-white/15 transition text-sm"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
                    {showPwd
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/15 border border-red-400/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
