import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getTokenDisplay } from '../../api';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pop {
    0%   { transform:scale(1); }
    35%  { transform:scale(1.08); }
    100% { transform:scale(1); }
  }
  @keyframes servePulse {
    0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0.0),0 4px 24px rgba(0,0,0,0.4); }
    50%     { box-shadow:0 0 0 6px rgba(99,102,241,0.10),0 4px 36px rgba(99,102,241,0.18); }
  }
  @keyframes servePulseLight {
    0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0.0),0 4px 24px rgba(0,0,0,0.08); }
    50%     { box-shadow:0 0 0 6px rgba(99,102,241,0.08),0 4px 36px rgba(99,102,241,0.12); }
  }
  @keyframes rowIn {
    from { opacity:0; transform:translateX(-10px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes pingDot {
    0%,100% { transform:scale(1); opacity:0.6; }
    50%     { transform:scale(1.6); opacity:0; }
  }
  @keyframes themeSpin {
    from { transform:rotate(0deg); }
    to   { transform:rotate(360deg); }
  }

  .fade-up     { animation: fadeUp     0.5s ease-out both; }
  .token-pop   { animation: pop        0.35s ease-out; }
  .serve-pulse { animation: servePulse 2.8s  ease-in-out infinite; }
  .row-in      { animation: rowIn      0.38s ease-out both; }

  /* ── Root ── */
  .td-root {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    background: linear-gradient(150deg,#0d1117 0%,#0f172a 45%,#191040 75%,#0d1117 100%);
    user-select: none;
    overflow-x: hidden;
    transition: background 0.35s ease;
  }
  .td-root.light {
    background: linear-gradient(150deg,#eef2ff 0%,#f8faff 45%,#f0f0ff 75%,#eef2ff 100%);
  }

  /* ── Header ── */
  .td-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
  }
  .td-brand { display:flex; align-items:center; gap:10px; min-width:0; flex:1; }
  .td-brand-icon {
    width:38px; height:38px; border-radius:12px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    box-shadow:0 3px 14px rgba(99,102,241,0.45);
  }
  .td-brand-name { font-weight:800; color:#fff; font-size:clamp(0.8rem,2.2vw,1rem); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 0.3s; }
  .td-brand-tag  { color:#818cf8; font-size:0.68rem; font-weight:500; white-space:nowrap; transition:color 0.3s; }

  .td-root.light .td-brand-name { color:#1e1b4b; }
  .td-root.light .td-brand-tag  { color:#6366f1; }

  .td-doctor-center {
    flex:1; display:flex; flex-direction:column; align-items:center;
    min-width:0;
  }
  .td-doctor-name { font-weight:700; color:rgba(255,255,255,0.88); font-size:clamp(0.78rem,2vw,0.95rem); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; transition:color 0.3s; }
  .td-doctor-spec { color:rgba(255,255,255,0.38); font-size:0.68rem; white-space:nowrap; transition:color 0.3s; }

  .td-root.light .td-doctor-name { color:#1e1b4b; }
  .td-root.light .td-doctor-spec { color:#6b7280; }

  .td-clock { text-align:right; flex-shrink:0; }
  .td-time  {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; color:#fff; line-height:1;
    font-size:clamp(1rem,2.8vw,1.5rem); letter-spacing:0.02em; transition:color 0.3s;
  }
  .td-ampm  { color:#818cf8; font-size:0.7rem; font-weight:700; margin-left:4px; transition:color 0.3s; }
  .td-date  { color:rgba(255,255,255,0.3); font-size:0.65rem; margin-top:2px; transition:color 0.3s; }
  .td-live  { display:flex; align-items:center; justify-content:flex-end; gap:5px; margin-top:3px; }
  .td-live-dot-wrap { position:relative; width:8px; height:8px; }
  .td-live-dot-ping { position:absolute; inset:0; border-radius:50%; background:#4ade80; animation:pingDot 1.6s ease-in-out infinite; }
  .td-live-dot      { position:relative; width:8px; height:8px; border-radius:50%; background:#4ade80; }
  .td-live-text { color:#4ade80; font-size:0.62rem; font-weight:800; letter-spacing:0.15em; }

  .td-root.light .td-time  { color:#1e1b4b; }
  .td-root.light .td-ampm  { color:#6366f1; }
  .td-root.light .td-date  { color:#6b7280; }

  /* ── Theme toggle button ── */
  .td-theme-btn {
    width:34px; height:34px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer;
    border:1px solid rgba(255,255,255,0.14);
    background:rgba(255,255,255,0.08);
    transition:background 0.2s, border-color 0.2s, transform 0.15s;
    margin-right:10px;
  }
  .td-theme-btn:hover  { background:rgba(255,255,255,0.16); transform:scale(1.08); }
  .td-theme-btn:active { transform:scale(0.92); }
  .td-theme-btn svg    { transition:transform 0.4s cubic-bezier(.34,1.56,.64,1); }
  .td-theme-btn:hover svg { transform:rotate(20deg); }

  .td-root.light .td-theme-btn {
    border-color:rgba(99,102,241,0.22);
    background:rgba(99,102,241,0.08);
  }
  .td-root.light .td-theme-btn:hover { background:rgba(99,102,241,0.16); }

  /* ── Glass card base ── */
  .dglass {
    border-radius:20px;
    background:rgba(255,255,255,0.05);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
    border:1px solid rgba(255,255,255,0.09);
    box-shadow:0 4px 24px rgba(0,0,0,0.3);
    transition:background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }
  .td-root.light .dglass {
    background:rgba(255,255,255,0.88);
    border:1px solid rgba(99,102,241,0.13);
    box-shadow:0 4px 20px rgba(99,102,241,0.08);
  }

  /* ── Stat cards grid ── */
  .td-stats {
    display:grid;
    grid-template-columns:1fr 1.2fr 1fr;
    gap:10px;
    padding:0 12px;
  }
  .stat-card {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:20px 8px;
    gap:6px;
    position:relative;
    overflow:hidden;
  }
  .stat-icon {
    width:32px; height:32px; border-radius:10px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .stat-label {
    font-size:0.6rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase;
  }
  .stat-value {
    font-weight:900; line-height:1; letter-spacing:-0.02em;
    font-size:clamp(2rem,6vw,3.2rem);
  }
  .stat-divider { width:28px; height:2px; border-radius:2px; opacity:0.3; }

  /* Now Serving card extras */
  .stat-card-serve {
    background:rgba(99,102,241,0.10) !important;
    border:1px solid rgba(99,102,241,0.28) !important;
  }
  .td-root.light .stat-card-serve {
    background:rgba(99,102,241,0.07) !important;
    border:1px solid rgba(99,102,241,0.18) !important;
    animation-name:servePulseLight !important;
  }
  .serve-token {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; color:#fff; line-height:1; white-space:nowrap;
    font-size:clamp(1.6rem,6vw,3rem);
    letter-spacing:0.02em;
    text-shadow:0 0 40px rgba(99,102,241,0.55);
    transition:color 0.3s, text-shadow 0.3s;
  }
  .td-root.light .serve-token { color:#1e1b4b; text-shadow:0 0 30px rgba(99,102,241,0.18); }
  .serve-name {
    color:rgba(255,255,255,0.65); font-weight:600; font-size:0.8rem;
    text-align:center; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    transition:color 0.3s;
  }
  .td-root.light .serve-name { color:#4b5563; }
  .serve-status {
    display:flex; align-items:center; gap:5px;
    color:#a5b4fc; font-size:0.62rem; font-weight:800; letter-spacing:0.15em; text-transform:uppercase;
    transition:color 0.3s;
  }
  .td-root.light .serve-status { color:#6366f1; }

  /* ── Next in Queue ── */
  .td-queue {
    flex:1; margin:0 12px 10px; display:flex; flex-direction:column; overflow:hidden;
  }
  .td-queue-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px;
    border-bottom:1px solid rgba(255,255,255,0.06);
    transition:border-color 0.3s;
  }
  .td-root.light .td-queue-header { border-bottom-color:rgba(0,0,0,0.08); }
  .td-queue-title {
    display:flex; align-items:center; gap:8px;
    color:rgba(255,255,255,0.6); font-size:0.72rem; font-weight:800; letter-spacing:0.18em; text-transform:uppercase;
    transition:color 0.3s;
  }
  .td-root.light .td-queue-title { color:#4b5563; }
  .td-queue-icon {
    width:26px; height:26px; border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(99,102,241,0.18);
    transition:background 0.3s;
  }
  .td-root.light .td-queue-icon { background:rgba(99,102,241,0.12); }
  .td-queue-badge {
    font-size:0.65rem; font-weight:700; padding:3px 10px; border-radius:99px;
    background:rgba(99,102,241,0.18); color:#a5b4fc; border:1px solid rgba(99,102,241,0.25);
    transition:background 0.3s, color 0.3s, border-color 0.3s;
  }
  .td-root.light .td-queue-badge { background:rgba(99,102,241,0.1); color:#4338ca; border-color:rgba(99,102,241,0.22); }

  /* Queue rows */
  .td-queue-row {
    display:flex; align-items:center; gap:10px;
    padding:10px 14px;
    border-bottom:1px solid rgba(255,255,255,0.04);
    transition:background 0.2s, border-color 0.3s;
  }
  .td-queue-row:last-child { border-bottom:none; }
  .td-queue-row-first { background:rgba(99,102,241,0.07); }
  .td-root.light .td-queue-row { border-bottom-color:rgba(0,0,0,0.05); }
  .td-root.light .td-queue-row-first { background:rgba(99,102,241,0.05); }

  .td-rank {
    width:30px; height:30px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:0.75rem;
    transition:background 0.3s, color 0.3s;
  }
  .td-rank-1 { background:rgba(99,102,241,0.22); color:#a5b4fc; }
  .td-rank-n { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.25); }
  .td-root.light .td-rank-1 { background:rgba(99,102,241,0.14); color:#4338ca; }
  .td-root.light .td-rank-n { background:rgba(0,0,0,0.05); color:#9ca3af; }

  .td-row-token {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; white-space:nowrap; flex-shrink:0;
    font-size:clamp(1rem,2.5vw,1.4rem); letter-spacing:0.02em;
    width:clamp(80px,14vw,130px);
    transition:color 0.3s, text-shadow 0.3s;
  }
  .td-row-token-1 { color:#fff; text-shadow:0 0 20px rgba(99,102,241,0.4); }
  .td-row-token-n { color:rgba(255,255,255,0.22); }
  .td-root.light .td-row-token-1 { color:#1e1b4b; text-shadow:none; }
  .td-root.light .td-row-token-n { color:#d1d5db; }

  .td-row-info { flex:1; min-width:0; }
  .td-row-name {
    font-weight:600; font-size:clamp(0.75rem,1.8vw,0.9rem);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    transition:color 0.3s;
  }
  .td-row-name-1 { color:rgba(255,255,255,0.82); }
  .td-row-name-n { color:rgba(255,255,255,0.28); }
  .td-row-time { color:rgba(255,255,255,0.25); font-size:0.65rem; font-weight:500; margin-top:1px; transition:color 0.3s; }
  .td-root.light .td-row-name-1 { color:#111827; }
  .td-root.light .td-row-name-n { color:#d1d5db; }
  .td-root.light .td-row-time   { color:#9ca3af; }

  .td-badge-next {
    flex-shrink:0; font-size:0.62rem; font-weight:800; padding:4px 10px; border-radius:99px;
    background:rgba(99,102,241,0.22); color:#a5b4fc; border:1px solid rgba(99,102,241,0.35);
    white-space:nowrap; transition:background 0.3s, color 0.3s, border-color 0.3s;
  }
  .td-badge-q {
    flex-shrink:0; font-size:0.62rem; font-weight:600; padding:4px 10px; border-radius:99px;
    background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.22);
    white-space:nowrap; transition:background 0.3s, color 0.3s;
  }
  .td-root.light .td-badge-next { background:rgba(99,102,241,0.14); color:#4338ca; border-color:rgba(99,102,241,0.28); }
  .td-root.light .td-badge-q   { background:rgba(0,0,0,0.04); color:#9ca3af; }

  /* ── Empty state ── */
  .td-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:28px 12px; gap:8px;
  }
  .td-empty-icon {
    width:44px; height:44px; border-radius:14px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,0.04);
    transition:background 0.3s;
  }
  .td-empty-text { color:rgba(255,255,255,0.2); font-size:0.78rem; font-weight:500; transition:color 0.3s; }
  .td-root.light .td-empty-icon { background:rgba(0,0,0,0.05); }
  .td-root.light .td-empty-text { color:#9ca3af; }

  /* ── Footer ── */
  .td-footer {
    text-align:center; padding:8px 12px;
    color:rgba(255,255,255,0.18); font-size:0.62rem;
    border-top:1px solid rgba(255,255,255,0.05);
    transition:color 0.3s, border-color 0.3s;
  }
  .td-root.light .td-footer { color:#9ca3af; border-top-color:rgba(0,0,0,0.08); }

  /* ── Mobile tweaks ── */
  @media (max-width: 480px) {
    .td-header { padding:8px 10px; gap:8px; }
    .td-brand-icon { width:32px; height:32px; border-radius:10px; }
    .td-brand-name { font-size:0.72rem; }
    .td-brand-tag  { font-size:0.6rem; }
    .td-doctor-center { display:none; }
    .td-time { font-size:1rem; }
    .td-date { display:none; }
    .td-stats { gap:6px; padding:0 8px; }
    .stat-card { padding:14px 4px; gap:4px; }
    .stat-icon { width:26px; height:26px; border-radius:8px; }
    .stat-label { font-size:0.52rem; letter-spacing:0.12em; }
    .stat-value { font-size:clamp(1.5rem,10vw,2.5rem); }
    .serve-token { font-size:clamp(1.3rem,9vw,2.2rem); }
    .serve-name { font-size:0.72rem; max-width:110px; }
    .serve-status { font-size:0.55rem; }
    .td-progress { margin:0 8px; padding:6px 10px; }
    .td-queue { margin:0 8px 8px; }
    .td-queue-row { padding:8px 10px; gap:7px; }
    .td-rank { width:24px; height:24px; border-radius:7px; font-size:0.65rem; }
    .td-row-token { width:68px; font-size:0.88rem; }
    .td-row-name { font-size:0.72rem; }
    .td-badge-next, .td-badge-q { padding:3px 7px; font-size:0.58rem; }
    .td-theme-btn { width:28px; height:28px; border-radius:8px; margin-right:6px; }
  }

  @media (max-width:360px) {
    .stat-value { font-size:clamp(1.2rem,9vw,2rem); }
    .serve-token { font-size:clamp(1.1rem,8vw,1.9rem); }
    .td-stats { grid-template-columns:1fr 1.1fr 1fr; gap:4px; padding:0 6px; }
  }

  @media (min-width:1024px) {
    .td-header { padding:12px 24px; }
    .td-brand-icon { width:44px; height:44px; border-radius:14px; }
    .td-brand-name { font-size:1.05rem; }
    .td-stats { gap:14px; padding:0 20px; }
    .stat-card { padding:28px 12px; gap:8px; }
    .stat-icon { width:38px; height:38px; border-radius:12px; }
    .stat-value { font-size:clamp(2.5rem,5vw,3.8rem); }
    .serve-token { font-size:clamp(2.2rem,5vw,3.6rem); }
    .td-progress { margin:0 20px; padding:10px 18px; }
    .td-queue { margin:0 20px 16px; }
    .td-queue-row { padding:12px 18px; gap:14px; }
    .td-rank { width:36px; height:36px; border-radius:12px; font-size:0.82rem; }
    .td-row-token { width:160px; font-size:1.5rem; }
    .td-row-name { font-size:0.95rem; }
    .td-queue-header { padding:12px 18px; }
  }
`;

const DGlass = ({ children, className = '', style = {} }) => (
  <div className={`dglass ${className}`} style={style}>{children}</div>
);

const SunIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

export default function TokenDisplay() {
  const { doctorId } = useParams();

  const [current, setCurrent] = useState(null);
  const [next,    setNext   ] = useState([]);
  const [doctor,  setDoctor ] = useState(null);
  const [counts,  setCounts ] = useState({ waiting:0, completed:0, in_progress:0, total:0 });
  const [time,    setTime   ] = useState(new Date());
  const [popKey,  setPopKey ] = useState(0);
  const [theme,   setTheme  ] = useState(() => localStorage.getItem('td_theme') || 'dark');

  const isLight = theme === 'light';

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('td_theme', next);
      return next;
    });
  };

  const hospitalName = localStorage.getItem('hospital_name')    || 'Hospital Management';
  const tagline      = localStorage.getItem('hospital_tagline') || 'Quality Healthcare';

  const tenantIdRef = useRef('');

  const refresh = useCallback(async () => {
    try {
      const { data: td } = await getTokenDisplay(doctorId);
      setCurrent(prev => {
        if (td.current?.token_display !== prev?.token_display) setPopKey(k => k + 1);
        return td.current;
      });
      setNext(td.next || []);
      if (td.doctor) {
        setDoctor(td.doctor);
        if (td.doctor.tenant_id) tenantIdRef.current = String(td.doctor.tenant_id);
      }
      if (td.counts) setCounts(td.counts);
    } catch {}
  }, [doctorId]);

  useEffect(() => {
    refresh();
    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      // Re-subscribe once we know tenantId (populated after first refresh)
    });
    const handleUpdate = ({ doctor_id }) => {
      if (String(doctor_id) === String(doctorId)) refresh();
    };
    // Poll-based fallback handles the case where tenantId isn't known yet
    // Socket events are a bonus when tenant_id is available
    setTimeout(() => {
      if (tenantIdRef.current) {
        socket.on(`token_update_${tenantIdRef.current}`, handleUpdate);
      }
    }, 2000);
    const poll  = setInterval(refresh, 10000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { socket.disconnect(); clearInterval(poll); clearInterval(clock); };
  }, [refresh, doctorId]);

  const pad = n => String(n).padStart(2, '0');
  const h   = time.getHours();
  const ampm = h < 12 ? 'AM' : 'PM';
  const timeStr = `${pad(h % 12 || 12)}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  const dateStr = time.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  return (
    <>
      <style>{css}</style>

      <div className={`td-root${isLight ? ' light' : ''}`}>

        {/* Ambient glows */}
        <div style={{ pointerEvents:'none', position:'fixed', inset:0, overflow:'hidden', zIndex:0 }}>
          <div style={{ position:'absolute', width:'50vw', height:'50vw', maxWidth:500, borderRadius:'50%', background: isLight ? 'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 65%)', top:'-15%', left:'-10%', transition:'background 0.4s' }} />
          <div style={{ position:'absolute', width:'40vw', height:'40vw', maxWidth:420, borderRadius:'50%', background: isLight ? 'radial-gradient(circle,rgba(16,185,129,0.05) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 65%)', bottom:'-10%', right:'-5%', transition:'background 0.4s' }} />
          <div style={{ position:'absolute', width:'30vw', height:'30vw', maxWidth:320, borderRadius:'50%', background: isLight ? 'radial-gradient(circle,rgba(245,158,11,0.04) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)', top:'35%', right:'20%', transition:'background 0.4s' }} />
        </div>

        {/* ── Header ── */}
        <DGlass className="fade-up" style={{ margin:'10px 12px 0', position:'relative', zIndex:1, animationDelay:'0ms' }}>
          <div className="td-header">

            <div className="td-brand">
              <div className="td-brand-icon">
                <img src="/logo.png" alt="" style={{ width:22, height:22, objectFit:'contain' }}
                  onError={e => { e.target.style.display='none'; }} />
              </div>
              <div>
                <div className="td-brand-name">{hospitalName}</div>
                <div className="td-brand-tag">{tagline}</div>
              </div>
            </div>

            <div className="td-doctor-center">
              <div className="td-doctor-name">{doctor?.name || '—'}</div>
              <div className="td-doctor-spec">{doctor?.specialization}</div>
            </div>

            <button
              className="td-theme-btn"
              onClick={toggleTheme}
              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label="Toggle theme"
            >
              {isLight ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="td-clock">
              <div className="td-time">
                {timeStr}
                <span className="td-ampm">{ampm}</span>
              </div>
              <div className="td-date">{dateStr}</div>
              <div className="td-live">
                <div className="td-live-dot-wrap">
                  <div className="td-live-dot-ping" />
                  <div className="td-live-dot" />
                </div>
                <span className="td-live-text">LIVE</span>
              </div>
            </div>
          </div>
        </DGlass>

        {/* Wrapper with z-index for content above glows */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, paddingTop:10, position:'relative', zIndex:1 }}>

          {/* Mobile doctor name */}
          <div style={{ display:'none' }} className="mobile-doc-name">
            <div style={{ textAlign:'center', color: isLight ? '#1e1b4b' : 'rgba(255,255,255,0.8)', fontWeight:700, fontSize:'0.82rem' }}>{doctor?.name}</div>
            <div style={{ textAlign:'center', color: isLight ? '#6b7280' : 'rgba(255,255,255,0.35)', fontSize:'0.65rem' }}>{doctor?.specialization}</div>
          </div>

          {/* ── Stat cards ── */}
          <div className="td-stats fade-up" style={{ animationDelay:'60ms' }}>

            {/* WAITING */}
            <DGlass className="stat-card">
              <div className="stat-icon" style={{ background:'rgba(245,158,11,0.12)' }}>
                <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span className="stat-label" style={{ color:'rgba(251,191,36,0.8)' }}>Waiting</span>
              <span className="stat-value" style={{ color:'#fbbf24', textShadow:'0 0 30px rgba(245,158,11,0.3)' }}>
                {counts.waiting}
              </span>
              <div className="stat-divider" style={{ background:'#f59e0b' }} />
            </DGlass>

            {/* NOW SERVING */}
            <DGlass key={popKey}
              className="stat-card stat-card-serve serve-pulse"
              style={{ animationDelay:'120ms' }}>
              <div className="stat-icon" style={{ background:'rgba(99,102,241,0.18)' }}>
                <svg width="16" height="16" fill="none" stroke="#818cf8" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <span className="stat-label" style={{ color:'rgba(165,180,252,0.8)' }}>Now Serving</span>

              {current ? (
                <>
                  <span className="serve-token token-pop">{current.token_display}</span>
                  <div className="stat-divider" style={{ background:'#6366f1' }} />
                  <span className="serve-name">{current.patient?.name}</span>
                </>
              ) : (
                <>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)', fontSize:'clamp(1.4rem,5vw,2.5rem)' }}>—</span>
                  <span style={{ color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>No active patient</span>
                </>
              )}

              <div className="serve-status">
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', display:'inline-block', animation:'ping 1.4s ease-in-out infinite' }} />
                IN PROGRESS
              </div>
            </DGlass>

            {/* COMPLETED */}
            <DGlass className="stat-card">
              <div className="stat-icon" style={{ background:'rgba(16,185,129,0.12)' }}>
                <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span className="stat-label" style={{ color:'rgba(52,211,153,0.8)' }}>Completed</span>
              <span className="stat-value" style={{ color:'#34d399', textShadow:'0 0 30px rgba(16,185,129,0.3)' }}>
                {counts.completed}
              </span>
              <div className="stat-divider" style={{ background:'#10b981' }} />
            </DGlass>
          </div>

          {/* ── Next in Queue ── */}
          <DGlass className="td-queue fade-up" style={{ animationDelay:'230ms' }}>

            <div className="td-queue-header">
              <div className="td-queue-title">
                <div className="td-queue-icon">
                  <svg width="13" height="13" fill="none" stroke="#818cf8" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 11h16M4 16h10"/>
                  </svg>
                </div>
                Next in Queue
              </div>
              <span className="td-queue-badge">{counts.waiting} waiting</span>
            </div>

            {next.length > 0 ? (
              <div>
                {next.map((apt, i) => (
                  <div key={apt.id}
                    className={`td-queue-row row-in ${i === 0 ? 'td-queue-row-first' : ''}`}
                    style={{ animationDelay:`${270 + i * 60}ms` }}>

                    <div className={`td-rank ${i === 0 ? 'td-rank-1' : 'td-rank-n'}`}>{i + 1}</div>

                    <div className={`td-row-token ${i === 0 ? 'td-row-token-1' : 'td-row-token-n'}`}>
                      {apt.token_display}
                    </div>

                    <div className="td-row-info">
                      <div className={`td-row-name ${i === 0 ? 'td-row-name-1' : 'td-row-name-n'}`}>
                        {apt.patient?.name}
                      </div>
                      <div className="td-row-time">{apt.time_slot}</div>
                    </div>

                    {i === 0
                      ? <span className="td-badge-next">Up Next</span>
                      : <span className="td-badge-q">#{i + 1}</span>
                    }
                  </div>
                ))}
              </div>
            ) : (
              <div className="td-empty">
                <div className="td-empty-icon">
                  <svg width="22" height="22" fill="none" stroke={isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <p className="td-empty-text">No patients in queue</p>
              </div>
            )}
          </DGlass>
        </div>

        {/* Footer */}
        <div className="td-footer" style={{ position:'relative', zIndex:1 }}>
          Auto-refreshes every 10s &nbsp;·&nbsp; {hospitalName} &nbsp;·&nbsp; {doctor?.name || '—'}
        </div>

      </div>
    </>
  );
}
