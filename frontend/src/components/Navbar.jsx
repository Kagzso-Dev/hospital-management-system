import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function HospitalSettings({ onClose }) {
  const [name, setName]       = useState(() => localStorage.getItem('hospital_name') || 'Hospital Management');
  const [tagline, setTagline] = useState(() => localStorage.getItem('hospital_tagline') || '');
  const [saved, setSaved]     = useState(false);

  const save = (e) => {
    e.preventDefault();
    localStorage.setItem('hospital_name',    name.trim() || 'Hospital Management');
    localStorage.setItem('hospital_tagline', tagline.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in mt-16">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Hospital Settings</h3>
              <p className="text-xs text-gray-400">Customize your hospital identity</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          <div>
            <label className="label">Hospital Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City General Hospital"
              maxLength={60}
            />
          </div>
          <div>
            <label className="label">Tagline <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className="input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Caring for your health since 1990"
              maxLength={80}
            />
          </div>

          <div className="bg-blue-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <img src="/logo.png" alt="logo" className="w-7 h-7 object-contain rounded-md flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{name || 'Hospital Management'}</div>
              {tagline && <div className="text-blue-200 text-xs truncate">{tagline}</div>}
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary w-full flex items-center justify-center gap-2 ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [hospitalName, setHospitalName] = useState(
    () => localStorage.getItem('hospital_name') || 'Hospital Management'
  );

  useEffect(() => {
    if (!showSettings) {
      setHospitalName(localStorage.getItem('hospital_name') || 'Hospital Management');
    }
  }, [showSettings]);

  const sectionLabel = {
    '/reception': 'Reception',
    '/doctor':    'Doctor Panel',
    '/admin':     'Admin Panel',
    '/home':      'Home',
  };
  const label = Object.entries(sectionLabel).find(([key]) => pathname.startsWith(key))?.[1] ?? '';

  return (
    <>
      {/* ── Navbar — fixed h-14 so every page has an identical top bar ── */}
      <nav className="h-14 w-full bg-white/10 backdrop-blur-md border-b border-white/20 text-white shadow-lg animate-fade-in sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-3 xs:px-4 sm:px-6 flex items-center justify-between gap-2">

          {/* ── Left: logo + hospital name + breadcrumb ── */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0" title="Go to splash">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-8 h-8 object-contain rounded-lg"
              />
            </Link>

            {/* Name — always visible, clamp width on small screens */}
            <span className="font-bold text-xs xs:text-sm sm:text-base tracking-wide truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] md:max-w-none leading-none">
              {hospitalName}
            </span>

            {/* Breadcrumb divider + section label */}
            {label && (
              <>
                <span className="text-white/35 flex-shrink-0 text-sm leading-none select-none">/</span>
                <span className="text-white/75 text-xs xs:text-sm font-medium truncate leading-none">
                  {label}
                </span>
              </>
            )}
          </div>

          {/* ── Right: action buttons ── */}
          <div className="flex items-center gap-1 xs:gap-1.5 flex-shrink-0">

            {/* Back */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              title="Go back"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* Settings — hidden on Admin Panel */}
            {pathname.startsWith('/admin') && <button
              onClick={() => setShowSettings(true)}
              title="Hospital Settings"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>}

            {/* Home */}
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

            {/* Logout */}
            <button
              onClick={() => { localStorage.removeItem('tenant_token'); localStorage.removeItem('tenant_info'); navigate('/login'); }}
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

      {showSettings && <HospitalSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
