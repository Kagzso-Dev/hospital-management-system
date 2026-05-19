import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getTokenDisplay, getDoctors } from '../../api';

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
  @keyframes rowIn {
    from { opacity:0; transform:translateX(-10px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes pingDot {
    0%,100% { transform:scale(1); opacity:0.6; }
    50%     { transform:scale(1.6); opacity:0; }
  }

  .fade-up     { animation: fadeUp     0.5s ease-out both; }
  .token-pop   { animation: pop        0.35s ease-out; }
  .serve-pulse { animation: servePulse 2.8s  ease-in-out infinite; }
  .row-in      { animation: rowIn      0.38s ease-out both; }

  .td-root {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    background: linear-gradient(150deg,#0d1117 0%,#0f172a 45%,#191040 75%,#0d1117 100%);
    user-select: none;
    overflow-x: hidden;
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
  .td-brand-name { font-weight:800; color:#fff; font-size:clamp(0.8rem,2.2vw,1rem); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .td-brand-tag  { color:#818cf8; font-size:0.68rem; font-weight:500; white-space:nowrap; }

  .td-doctor-center {
    flex:1; display:flex; flex-direction:column; align-items:center;
    min-width:0;
  }
  .td-doctor-name { font-weight:700; color:rgba(255,255,255,0.88); font-size:clamp(0.78rem,2vw,0.95rem); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
  .td-doctor-spec { color:rgba(255,255,255,0.38); font-size:0.68rem; white-space:nowrap; }

  .td-clock { text-align:right; flex-shrink:0; }
  .td-time  {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; color:#fff; line-height:1;
    font-size:clamp(1rem,2.8vw,1.5rem); letter-spacing:0.02em;
  }
  .td-ampm  { color:#818cf8; font-size:0.7rem; font-weight:700; margin-left:4px; }
  .td-date  { color:rgba(255,255,255,0.3); font-size:0.65rem; margin-top:2px; }
  .td-live  { display:flex; align-items:center; justify-content:flex-end; gap:5px; margin-top:3px; }
  .td-live-dot-wrap { position:relative; width:8px; height:8px; }
  .td-live-dot-ping { position:absolute; inset:0; border-radius:50%; background:#4ade80; animation:pingDot 1.6s ease-in-out infinite; }
  .td-live-dot      { position:relative; width:8px; height:8px; border-radius:50%; background:#4ade80; }
  .td-live-text { color:#4ade80; font-size:0.62rem; font-weight:800; letter-spacing:0.15em; }

  /* ── Glass card base ── */
  .dglass {
    border-radius:20px;
    background:rgba(255,255,255,0.05);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
    border:1px solid rgba(255,255,255,0.09);
    box-shadow:0 4px 24px rgba(0,0,0,0.3);
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
  .serve-token {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; color:#fff; line-height:1; white-space:nowrap;
    font-size:clamp(1.6rem,6vw,3rem);
    letter-spacing:0.02em;
    text-shadow:0 0 40px rgba(99,102,241,0.55);
  }
  .serve-name {
    color:rgba(255,255,255,0.65); font-weight:600; font-size:0.8rem;
    text-align:center; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .serve-status {
    display:flex; align-items:center; gap:5px;
    color:#a5b4fc; font-size:0.62rem; font-weight:800; letter-spacing:0.15em; text-transform:uppercase;
  }

  /* ── Progress strip ── */
  .td-progress {
    display:flex; align-items:center; gap:10px;
    margin:0 12px;
    padding:8px 14px;
  }
  .td-progress-label { color:rgba(255,255,255,0.35); font-size:0.65rem; font-weight:600; white-space:nowrap; }
  .td-progress-bar-bg {
    flex:1; border-radius:99px; height:5px; overflow:hidden;
    background:rgba(255,255,255,0.07);
  }
  .td-progress-bar-fill {
    height:100%; border-radius:99px;
    background:linear-gradient(90deg,#6366f1,#10b981);
    transition:width 0.8s ease;
  }
  .td-progress-pct { color:rgba(255,255,255,0.4); font-size:0.65rem; font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums; }

  /* ── Next in Queue ── */
  .td-queue {
    flex:1; margin:0 12px 10px; display:flex; flex-direction:column; overflow:hidden;
  }
  .td-queue-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px;
    border-bottom:1px solid rgba(255,255,255,0.06);
  }
  .td-queue-title {
    display:flex; align-items:center; gap:8px;
    color:rgba(255,255,255,0.6); font-size:0.72rem; font-weight:800; letter-spacing:0.18em; text-transform:uppercase;
  }
  .td-queue-icon {
    width:26px; height:26px; border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(99,102,241,0.18);
  }
  .td-queue-badge {
    font-size:0.65rem; font-weight:700; padding:3px 10px; border-radius:99px;
    background:rgba(99,102,241,0.18); color:#a5b4fc; border:1px solid rgba(99,102,241,0.25);
  }

  /* Queue rows */
  .td-queue-row {
    display:flex; align-items:center; gap:10px;
    padding:10px 14px;
    border-bottom:1px solid rgba(255,255,255,0.04);
    transition:background 0.2s;
  }
  .td-queue-row:last-child { border-bottom:none; }
  .td-queue-row-first { background:rgba(99,102,241,0.07); }

  .td-rank {
    width:30px; height:30px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:0.75rem;
  }
  .td-rank-1 { background:rgba(99,102,241,0.22); color:#a5b4fc; }
  .td-rank-n { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.25); }

  .td-row-token {
    font-family:'JetBrains Mono','Courier New',monospace;
    font-weight:800; white-space:nowrap; flex-shrink:0;
    font-size:clamp(1rem,2.5vw,1.4rem); letter-spacing:0.02em;
    width:clamp(80px,14vw,130px);
  }
  .td-row-token-1 { color:#fff; text-shadow:0 0 20px rgba(99,102,241,0.4); }
  .td-row-token-n { color:rgba(255,255,255,0.22); }

  .td-row-info { flex:1; min-width:0; }
  .td-row-name {
    font-weight:600; font-size:clamp(0.75rem,1.8vw,0.9rem);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .td-row-name-1 { color:rgba(255,255,255,0.82); }
  .td-row-name-n { color:rgba(255,255,255,0.28); }
  .td-row-time { color:rgba(255,255,255,0.25); font-size:0.65rem; font-weight:500; margin-top:1px; }

  .td-badge-next {
    flex-shrink:0; font-size:0.62rem; font-weight:800; padding:4px 10px; border-radius:99px;
    background:rgba(99,102,241,0.22); color:#a5b4fc; border:1px solid rgba(99,102,241,0.35);
    white-space:nowrap;
  }
  .td-badge-q {
    flex-shrink:0; font-size:0.62rem; font-weight:600; padding:4px 10px; border-radius:99px;
    background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.22);
    white-space:nowrap;
  }

  /* ── Empty state ── */
  .td-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:28px 12px; gap:8px;
  }
  .td-empty-icon {
    width:44px; height:44px; border-radius:14px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,0.04);
  }
  .td-empty-text { color:rgba(255,255,255,0.2); font-size:0.78rem; font-weight:500; }

  /* ── Footer ── */
  .td-footer {
    text-align:center; padding:8px 12px;
    color:rgba(255,255,255,0.18); font-size:0.62rem;
    border-top:1px solid rgba(255,255,255,0.05);
  }

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

export default function TokenDisplay() {
  const { doctorId } = useParams();

  const [current, setCurrent] = useState(null);
  const [next,    setNext   ] = useState([]);
  const [doctor,  setDoctor ] = useState(null);
  const [counts,  setCounts ] = useState({ waiting:0, completed:0, in_progress:0, total:0 });
  const [time,    setTime   ] = useState(new Date());
  const [popKey,  setPopKey ] = useState(0);

  const hospitalName = localStorage.getItem('hospital_name')    || 'Hospital Management';
  const tagline      = localStorage.getItem('hospital_tagline') || 'Quality Healthcare';

  const refresh = useCallback(async () => {
    try {
      const [{ data: td }, { data: docs }] = await Promise.all([
        getTokenDisplay(doctorId),
        getDoctors(),
      ]);
      setCurrent(prev => {
        if (td.current?.token_display !== prev?.token_display) setPopKey(k => k + 1);
        return td.current;
      });
      setNext(td.next || []);
      setDoctor(docs.find(d => String(d.id) === String(doctorId)));
      if (td.counts) setCounts(td.counts);
    } catch {}
  }, [doctorId]);

  useEffect(() => {
    refresh();
    const tenantInfo = JSON.parse(localStorage.getItem('tenant_info') || '{}');
    const tenantId = tenantInfo.id || '';
    const socket = io('http://localhost:5000');
    socket.on(`token_update_${tenantId}`, ({ doctor_id }) => {
      if (String(doctor_id) === String(doctorId)) refresh();
    });
    const poll  = setInterval(refresh, 10000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { socket.disconnect(); clearInterval(poll); clearInterval(clock); };
  }, [refresh, doctorId]);

  const pad = n => String(n).padStart(2, '0');
  const h   = time.getHours();
  const ampm = h < 12 ? 'AM' : 'PM';
  const timeStr = `${pad(h % 12 || 12)}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  const dateStr = time.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  const total = counts.total || 0;
  const pct   = total > 0 ? Math.round(((counts.completed || 0) / total) * 100) : 0;

  return (
    <>
      <style>{css}</style>

      <div className="td-root">

        {/* Ambient glows */}
        <div style={{ pointerEvents:'none', position:'fixed', inset:0, overflow:'hidden', zIndex:0 }}>
          <div style={{ position:'absolute', width:'50vw', height:'50vw', maxWidth:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 65%)', top:'-15%', left:'-10%' }} />
          <div style={{ position:'absolute', width:'40vw', height:'40vw', maxWidth:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 65%)', bottom:'-10%', right:'-5%' }} />
          <div style={{ position:'absolute', width:'30vw', height:'30vw', maxWidth:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)', top:'35%', right:'20%' }} />
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
            <div style={{ textAlign:'center', color:'rgba(255,255,255,0.8)', fontWeight:700, fontSize:'0.82rem' }}>{doctor?.name}</div>
            <div style={{ textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:'0.65rem' }}>{doctor?.specialization}</div>
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
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, color:'rgba(255,255,255,0.12)', fontSize:'clamp(1.4rem,5vw,2.5rem)' }}>—</span>
                  <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>No active patient</span>
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

          {/* ── Progress strip ── */}
          {/* Hidden per user request */}

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
                  <svg width="22" height="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" viewBox="0 0 24 24">
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
