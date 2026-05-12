import{r as i,j as e}from"./vendor-react-bYbXmgvo.js";import{l as L}from"./vendor-socket-BcxXcwBL.js";import{l as W,g as B}from"./index-CKDXB5h9.js";import{c as _}from"./vendor-router-CC6cNi32.js";import"./vendor-axios-DZ_Kha3d.js";const $=`
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
`,l=({children:n,className:o="",style:m={}})=>e.jsx("div",{className:`dglass ${o}`,style:m,children:n});function H(){var w;const{doctorId:n}=_(),[o,m]=i.useState(null),[h,v]=i.useState([]),[a,y]=i.useState(null),[d,j]=i.useState({waiting:0,completed:0,in_progress:0,total:0}),[p,k]=i.useState(new Date),[N,z]=i.useState(0),f=localStorage.getItem("hospital_name")||"Hospital Management",S=localStorage.getItem("hospital_tagline")||"Quality Healthcare",c=i.useCallback(async()=>{try{const[{data:t},{data:r}]=await Promise.all([W(n),B()]);m(s=>{var x;return((x=t.current)==null?void 0:x.token_display)!==(s==null?void 0:s.token_display)&&z(D=>D+1),t.current}),v(t.next||[]),y(r.find(s=>String(s.id)===String(n))),t.counts&&j(t.counts)}catch{}},[n]);i.useEffect(()=>{c();const t=L("http://localhost:5000");t.on("token_update",({doctor_id:x})=>{String(x)===String(n)&&c()});const r=setInterval(c,1e4),s=setInterval(()=>k(new Date),1e3);return()=>{t.disconnect(),clearInterval(r),clearInterval(s)}},[c,n]);const g=t=>String(t).padStart(2,"0"),u=p.getHours(),q=u<12?"AM":"PM",M=`${g(u%12||12)}:${g(p.getMinutes())}:${g(p.getSeconds())}`,I=p.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}),b=d.total||0;return b>0&&Math.round((d.completed||0)/b*100),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:$}),e.jsxs("div",{className:"td-root",children:[e.jsxs("div",{style:{pointerEvents:"none",position:"fixed",inset:0,overflow:"hidden",zIndex:0},children:[e.jsx("div",{style:{position:"absolute",width:"50vw",height:"50vw",maxWidth:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 65%)",top:"-15%",left:"-10%"}}),e.jsx("div",{style:{position:"absolute",width:"40vw",height:"40vw",maxWidth:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 65%)",bottom:"-10%",right:"-5%"}}),e.jsx("div",{style:{position:"absolute",width:"30vw",height:"30vw",maxWidth:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)",top:"35%",right:"20%"}})]}),e.jsx(l,{className:"fade-up",style:{margin:"10px 12px 0",position:"relative",zIndex:1,animationDelay:"0ms"},children:e.jsxs("div",{className:"td-header",children:[e.jsxs("div",{className:"td-brand",children:[e.jsx("div",{className:"td-brand-icon",children:e.jsx("img",{src:"/logo.png",alt:"",style:{width:22,height:22,objectFit:"contain"},onError:t=>{t.target.style.display="none"}})}),e.jsxs("div",{children:[e.jsx("div",{className:"td-brand-name",children:f}),e.jsx("div",{className:"td-brand-tag",children:S})]})]}),e.jsxs("div",{className:"td-doctor-center",children:[e.jsx("div",{className:"td-doctor-name",children:(a==null?void 0:a.name)||"—"}),e.jsx("div",{className:"td-doctor-spec",children:a==null?void 0:a.specialization})]}),e.jsxs("div",{className:"td-clock",children:[e.jsxs("div",{className:"td-time",children:[M,e.jsx("span",{className:"td-ampm",children:q})]}),e.jsx("div",{className:"td-date",children:I}),e.jsxs("div",{className:"td-live",children:[e.jsxs("div",{className:"td-live-dot-wrap",children:[e.jsx("div",{className:"td-live-dot-ping"}),e.jsx("div",{className:"td-live-dot"})]}),e.jsx("span",{className:"td-live-text",children:"LIVE"})]})]})]})}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:10,paddingTop:10,position:"relative",zIndex:1},children:[e.jsxs("div",{style:{display:"none"},className:"mobile-doc-name",children:[e.jsx("div",{style:{textAlign:"center",color:"rgba(255,255,255,0.8)",fontWeight:700,fontSize:"0.82rem"},children:a==null?void 0:a.name}),e.jsx("div",{style:{textAlign:"center",color:"rgba(255,255,255,0.35)",fontSize:"0.65rem"},children:a==null?void 0:a.specialization})]}),e.jsxs("div",{className:"td-stats fade-up",style:{animationDelay:"60ms"},children:[e.jsxs(l,{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"rgba(245,158,11,0.12)"},children:e.jsx("svg",{width:"16",height:"16",fill:"none",stroke:"#f59e0b",strokeWidth:"1.8",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"})})}),e.jsx("span",{className:"stat-label",style:{color:"rgba(251,191,36,0.8)"},children:"Waiting"}),e.jsx("span",{className:"stat-value",style:{color:"#fbbf24",textShadow:"0 0 30px rgba(245,158,11,0.3)"},children:d.waiting}),e.jsx("div",{className:"stat-divider",style:{background:"#f59e0b"}})]}),e.jsxs(l,{className:"stat-card stat-card-serve serve-pulse",style:{animationDelay:"120ms"},children:[e.jsx("div",{className:"stat-icon",style:{background:"rgba(99,102,241,0.18)"},children:e.jsx("svg",{width:"16",height:"16",fill:"none",stroke:"#818cf8",strokeWidth:"1.8",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"})})}),e.jsx("span",{className:"stat-label",style:{color:"rgba(165,180,252,0.8)"},children:"Now Serving"}),o?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"serve-token token-pop",children:o.token_display}),e.jsx("div",{className:"stat-divider",style:{background:"#6366f1"}}),e.jsx("span",{className:"serve-name",children:(w=o.patient)==null?void 0:w.name})]}):e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:"rgba(255,255,255,0.12)",fontSize:"clamp(1.4rem,5vw,2.5rem)"},children:"—"}),e.jsx("span",{style:{color:"rgba(255,255,255,0.25)",fontSize:"0.72rem"},children:"No active patient"})]}),e.jsxs("div",{className:"serve-status",children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:"#6366f1",display:"inline-block",animation:"ping 1.4s ease-in-out infinite"}}),"IN PROGRESS"]})]},N),e.jsxs(l,{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",style:{background:"rgba(16,185,129,0.12)"},children:e.jsx("svg",{width:"16",height:"16",fill:"none",stroke:"#10b981",strokeWidth:"1.8",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"})})}),e.jsx("span",{className:"stat-label",style:{color:"rgba(52,211,153,0.8)"},children:"Completed"}),e.jsx("span",{className:"stat-value",style:{color:"#34d399",textShadow:"0 0 30px rgba(16,185,129,0.3)"},children:d.completed}),e.jsx("div",{className:"stat-divider",style:{background:"#10b981"}})]})]}),e.jsxs(l,{className:"td-queue fade-up",style:{animationDelay:"230ms"},children:[e.jsxs("div",{className:"td-queue-header",children:[e.jsxs("div",{className:"td-queue-title",children:[e.jsx("div",{className:"td-queue-icon",children:e.jsx("svg",{width:"13",height:"13",fill:"none",stroke:"#818cf8",strokeWidth:"2.5",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4 6h16M4 11h16M4 16h10"})})}),"Next in Queue"]}),e.jsxs("span",{className:"td-queue-badge",children:[d.waiting," waiting"]})]}),h.length>0?e.jsx("div",{children:h.map((t,r)=>{var s;return e.jsxs("div",{className:`td-queue-row row-in ${r===0?"td-queue-row-first":""}`,style:{animationDelay:`${270+r*60}ms`},children:[e.jsx("div",{className:`td-rank ${r===0?"td-rank-1":"td-rank-n"}`,children:r+1}),e.jsx("div",{className:`td-row-token ${r===0?"td-row-token-1":"td-row-token-n"}`,children:t.token_display}),e.jsxs("div",{className:"td-row-info",children:[e.jsx("div",{className:`td-row-name ${r===0?"td-row-name-1":"td-row-name-n"}`,children:(s=t.patient)==null?void 0:s.name}),e.jsx("div",{className:"td-row-time",children:t.time_slot})]}),r===0?e.jsx("span",{className:"td-badge-next",children:"Up Next"}):e.jsxs("span",{className:"td-badge-q",children:["#",r+1]})]},t.id)})}):e.jsxs("div",{className:"td-empty",children:[e.jsx("div",{className:"td-empty-icon",children:e.jsx("svg",{width:"22",height:"22",fill:"none",stroke:"rgba(255,255,255,0.2)",strokeWidth:"1.5",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"})})}),e.jsx("p",{className:"td-empty-text",children:"No patients in queue"})]})]})]}),e.jsxs("div",{className:"td-footer",style:{position:"relative",zIndex:1},children:["Auto-refreshes every 10s  ·  ",f,"  ·  ",(a==null?void 0:a.name)||"—"]})]})]})}export{H as default};
