import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const adminApi = axios.create({ baseURL: '/api/admin' });
adminApi.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('tenant_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

function syncToLocalStorage(settings) {
  if (settings.hospital_name)    localStorage.setItem('hospital_name',              settings.hospital_name);
  if (settings.hospital_tagline !== undefined) localStorage.setItem('hospital_tagline', settings.hospital_tagline || '');
  localStorage.setItem('procedure_charge_enabled', String(!!settings.procedure_charge_enabled));
}

function HospitalSettings({ onClose, onSaved }) {
  const tenantInfo = JSON.parse(sessionStorage.getItem('tenant_info') || '{}');
  const [name, setName]           = useState(() => localStorage.getItem('hospital_name') || tenantInfo.name || 'Hospital Management');
  const [tagline, setTagline]     = useState(() => localStorage.getItem('hospital_tagline') || '');
  const [procEnabled, setProcEnabled] = useState(() => localStorage.getItem('procedure_charge_enabled') === 'true');
  const [procPanelEnabled, setProcPanelEnabled] = useState(() => localStorage.getItem('reception_proc_panel_enabled') !== 'false');
  const [loading, setLoading]     = useState(true);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    adminApi.get('/settings').then(({ data }) => {
      if (data.hospital_name)    setName(data.hospital_name);
      if (data.hospital_tagline !== undefined) setTagline(data.hospital_tagline || '');
      if (data.procedure_charge_enabled !== undefined) setProcEnabled(!!data.procedure_charge_enabled);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      hospital_name: name.trim() || tenantInfo.name || 'Hospital Management',
      hospital_tagline: tagline.trim(),
      procedure_charge_enabled: procEnabled,
    };
    localStorage.setItem('reception_proc_panel_enabled', String(procPanelEnabled));
    try {
      await adminApi.put('/settings', payload);
      syncToLocalStorage(payload);
      setSaved(true);
      onSaved(payload.hospital_name);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 pt-16">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-72 animate-scale-in overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>

        {/* Gradient Header */}
        <div className="relative px-4 pt-4 pb-3.5 overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0369a1 50%, #0891b2 100%)' }}>
          {/* Decorative circles */}
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-full bg-white/8" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shadow-inner">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm leading-tight">Hospital Settings</h3>
                <p className="text-blue-100/70 text-[11px]">Customize your identity</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Live preview bar */}
          <div className="relative mt-3 flex items-center gap-2 bg-white/15 border border-white/25 rounded-xl px-2.5 py-2">
            <img src="/logo.png" alt="logo" className="w-6 h-6 object-contain rounded-md flex-shrink-0 bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-xs truncate leading-tight">
                {name || 'Hospital Management'}
              </div>
              {tagline
                ? <div className="text-blue-100/75 text-[10px] truncate leading-tight">{tagline}</div>
                : <div className="text-blue-200/40 text-[10px] italic">No tagline</div>
              }
            </div>
            <div className="flex-shrink-0 text-[9px] text-blue-200/50 font-bold uppercase tracking-wide">Live</div>
          </div>
        </div>

        {/* Form body — scrollable */}
        <form onSubmit={save} className="overflow-y-auto p-4 space-y-3.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading settings…
            </div>
          ) : (
            <>
              {/* Identity Section */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identity</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Hospital Name</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    <input
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:bg-white transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. City General Hospital"
                      maxLength={60}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Tagline <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </span>
                    <input
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:bg-white transition-all"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Caring for your health since 1990"
                      maxLength={80}
                    />
                  </div>
                </div>
              </div>

              {/* Reception Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reception</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                {[
                  {
                    key: 'proc',
                    label: 'Procedure Charges',
                    desc: 'Injection, IV drip, inhaler',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    ),
                    enabled: procEnabled,
                    toggle: () => setProcEnabled((v) => !v),
                  },
                  {
                    key: 'panel',
                    label: 'Pending Charges Panel',
                    desc: 'Show procedure queue on Reception',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
                      </svg>
                    ),
                    enabled: procPanelEnabled,
                    toggle: () => setProcPanelEnabled((v) => !v),
                  },
                ].map(({ key, label, desc, icon, enabled, toggle }) => (
                  <div
                    key={key}
                    onClick={toggle}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                      enabled
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      enabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold leading-tight ${enabled ? 'text-blue-900' : 'text-gray-700'}`}>
                        {label}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{desc}</div>
                    </div>
                    <div className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <button
                type="submit"
                className={`w-full py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-md ${
                  saved
                    ? 'bg-green-500 text-white shadow-green-200'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-200'
                }`}
              >
                {saved ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Settings
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const tenantInfo = JSON.parse(sessionStorage.getItem('tenant_info') || '{}');
  const [hospitalName, setHospitalName] = useState(
    () => localStorage.getItem('hospital_name') || tenantInfo.name || 'Hospital Management'
  );

  useEffect(() => {
    const token = sessionStorage.getItem('tenant_token');
    if (!token) return;
    adminApi.get('/settings').then(({ data }) => {
      if (data.hospital_name) {
        setHospitalName(data.hospital_name);
        syncToLocalStorage(data);
      }
    }).catch(() => {});
  }, []);

  const sectionLabel = {
    '/reception': 'Reception',
    '/doctor':    'Doctor Panel',
    '/admin':     'Admin Panel',
    '/home':      'Home',
  };
  const label = Object.entries(sectionLabel).find(([key]) => pathname.startsWith(key))?.[1] ?? '';

  return (
    <>
      <nav className="h-14 w-full bg-white/10 backdrop-blur-md border-b border-white/20 text-white shadow-lg animate-fade-in sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-3 xs:px-4 sm:px-6 flex items-center justify-between gap-2">

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0" title="Go to splash">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
            </Link>

            <span className="font-bold text-xs xs:text-sm sm:text-base tracking-wide truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] md:max-w-none leading-none">
              {hospitalName}
            </span>

            {label && (
              <>
                <span className="text-white/35 flex-shrink-0 text-sm leading-none select-none">/</span>
                <span className="text-white/75 text-xs xs:text-sm font-medium truncate leading-none">{label}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 xs:gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              title="Go back"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>

            {pathname.startsWith('/admin') && (
              <button
                onClick={() => setShowSettings(true)}
                title="Hospital Settings"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            <Link
              to="/home"
              className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              title="Go to home"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>

            <button
              onClick={() => { sessionStorage.removeItem('tenant_token'); sessionStorage.removeItem('tenant_info'); navigate('/login'); }}
              title="Logout"
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {showSettings && (
        <HospitalSettings
          onClose={() => setShowSettings(false)}
          onSaved={(newName) => setHospitalName(newName)}
        />
      )}
    </>
  );
}
