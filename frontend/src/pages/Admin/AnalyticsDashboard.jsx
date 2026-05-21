import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

const api = axios.create({ baseURL: '/api/admin' });
api.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('tenant_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('tenant_token');
      sessionStorage.removeItem('tenant_info');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

function fmtD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const STATUS_COLORS = {
  completed:   '#10b981',
  waiting:     '#f59e0b',
  in_progress: '#3b82f6',
  cancelled:   '#ef4444',
};

// ── Animated counter ─────────────────────────────────────────────────────────
function useCountUp(target, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(target); return; }
    setVal(0);
    if (!target) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [target, active]);
  return val;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, bg, border, icon }) {
  const animated = useCountUp(value);
  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-4 flex items-center gap-3 transition-all hover:shadow-md`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color} bg-white/70`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <p className={`text-2xl font-black ${color} leading-tight`}>{animated}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2.5 text-sm min-w-[130px]">
      <p className="font-semibold text-gray-700 mb-1.5 border-b pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};


// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const todayStr = fmtD(new Date());
  const [from, setFrom]     = useState(todayStr);
  const [to,   setTo  ]     = useState(todayStr);
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async (f, t) => {
    setLoad(true); setError('');
    try {
      const { data: res } = await api.get(`/analytics?from=${f}&to=${t}`);
      setData(res);
    } catch { setError('Failed to load analytics data'); }
    setLoad(false);
  }, []);

  useEffect(() => { load(from, to); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(from, to), 30000);
    return () => clearInterval(t);
  }, [autoRefresh, from, to, load]);

  const applyPreset = (days) => {
    const t = new Date();
    const f = new Date(t); f.setDate(f.getDate() - days + 1);
    const tf = fmtD(f), tt = fmtD(t);
    setFrom(tf); setTo(tt); load(tf, tt);
  };

  const [wasApplied, setWasApplied] = useState(false);

  const apply = async () => {
    await load(from, to);
    setWasApplied(true);
    setTimeout(() => setWasApplied(false), 1200);
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const summary     = data?.summary     || {};
  const dailyTrend  = data?.dailyTrend  || [];
  const byDoctor    = data?.byDoctor    || [];
  const peakHours   = data?.peakHours   || [];
  const patientStats = data?.patientStats || {};
  const dayOfWeek   = data?.dayOfWeek   || [];

  const total     = Number(summary.total       || 0);
  const completed = Number(summary.completed   || 0);
  const waiting   = Number(summary.waiting     || 0);
  const inProg    = Number(summary.in_progress || 0);
  const cancelled = Number(summary.cancelled   || 0);
  const pending   = waiting + inProg;
  const patients  = Number(patientStats.unique_patients || 0);
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Trend chart data
  const trendData = dailyTrend.map(d => ({
    date:      String(d.date).slice(5),
    Total:     Number(d.total),
    Completed: Number(d.completed),
    Pending:   Number(d.pending),
    Cancelled: Number(d.cancelled),
  }));

  // Status donut data
  const donutData = [
    { name: 'Completed',   value: completed, color: STATUS_COLORS.completed   },
    { name: 'Waiting',     value: waiting,   color: STATUS_COLORS.waiting     },
    { name: 'In Progress', value: inProg,    color: STATUS_COLORS.in_progress },
    { name: 'Cancelled',   value: cancelled, color: STATUS_COLORS.cancelled   },
  ].filter(d => d.value > 0);

  // Peak hours chart
  const hourData = peakHours.map(h => ({
    hour:  `${h.hour}:00`,
    Count: Number(h.count),
  }));

  // Doctor performance chart (horizontal bars)
  const docData = byDoctor.map(d => {
    const t = Number(d.total || 0);
    const c = Number(d.completed || 0);
    return {
      name:        d.name.replace('Dr. ', ''),
      id:          d.id,
      Total:       t,
      Completed:   c,
      Pending:     Number(d.waiting || 0) + Number(d.in_progress || 0),
      Cancelled:   Number(d.cancelled || 0),
      rate:        t > 0 ? Math.round((c / t) * 100) : 0,
    };
  });

  // Day of week chart
  const DOW = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowData = dayOfWeek.map(d => ({
    day:   DOW[Number(d.dow)] || d.dow,
    Total: Number(d.total),
    Done:  Number(d.completed),
  }));

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading && !data) return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white/20 h-14 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-white/20 h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white/20 h-64 rounded-2xl lg:col-span-2" />
        <div className="bg-white/20 h-64 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/20 h-56 rounded-2xl" />
        <div className="bg-white/20 h-56 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 sm:px-4 py-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
          {[['Today',1],['7d',7],['30d',30],['90d',90]].map(([lbl, d]) => (
            <button key={lbl} onClick={() => applyPreset(d)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/30 text-white/80 hover:bg-white/20 hover:text-white active:scale-95 transition-all">
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:flex-1">
          <div className="flex items-center gap-2 flex-1">
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="input py-1.5 text-sm flex-1 sm:w-36 sm:flex-none" />
            <span className="text-white/50 text-xs">→</span>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
              className="input py-1.5 text-sm flex-1 sm:w-36 sm:flex-none" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={apply}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm flex items-center justify-center gap-1.5 transition-all duration-300 min-w-[90px]
                ${wasApplied ? 'bg-green-600 text-white rounded-xl' : 'btn-primary'}`}>
              {loading ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : wasApplied ? (
                <svg className="w-3.5 h-3.5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              ) : null}
              {wasApplied ? 'Applied' : 'Apply'}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
              <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${autoRefresh ? 'bg-green-500' : 'bg-white/20'}`}
                onClick={() => setAutoRefresh(v => !v)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="hidden sm:inline">Auto-refresh</span>
            </label>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm">{error}</div>}

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total"      value={total}     color="text-indigo-700" bg="bg-indigo-50"  border="border-indigo-200"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>} />
        <KpiCard label="Completed"  value={completed} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <KpiCard label="Pending"    value={pending}   color="text-amber-700"   bg="bg-amber-50"   border="border-amber-200"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <KpiCard label="Cancelled"  value={cancelled} color="text-red-700"     bg="bg-red-50"     border="border-red-200"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <KpiCard label="Patients"   value={patients}  color="text-purple-700"  bg="bg-purple-50"  border="border-purple-200"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
        <KpiCard label="Done Rate"  value={rate}      color="text-teal-700"    bg="bg-teal-50"    border="border-teal-200"
          sub={`${rate}% completion`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} />
      </div>

      {/* ── Row 1: Daily Trend + Donut ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area / Line chart - daily trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:col-span-2">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Daily Appointment Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">{trendData.length} day{trendData.length !== 1 ? 's' : ''} in range</p>
            </div>
            <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
              {[['Total','#6366f1'],['Completed','#10b981'],['Cancelled','#ef4444']].map(([l,c]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data for this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Total"     stroke="#6366f1" strokeWidth={2.5} fill="url(#gTotal)"  dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2}   fill="url(#gDone)"   dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Cancelled" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2, fill: '#ef4444' }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut - status breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Status Breakdown</h3>
          <p className="text-xs text-gray-400 mb-3">All appointments in range</p>
          {donutData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-800 leading-none">{total}</span>
                  <span className="text-xs text-gray-400 mt-0.5">total</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 bg-gray-50">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 truncate">{d.name}</span>
                    <span className="ml-auto text-xs font-bold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Peak hours + Day of week ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Peak hours */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Peak Hours</h3>
          <p className="text-xs text-gray-400 mb-3">Appointments by time slot</p>
          {hourData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#f5f3ff' }} />
                <Bar dataKey="Count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {hourData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${260 + i * 8}, 70%, ${55 + i % 3 * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Day of week */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Busiest Days</h3>
          <p className="text-xs text-gray-400 mb-3">Appointments by day of week</p>
          {dowData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dowData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#ecfdf5' }} />
                <Bar dataKey="Total" fill="#a7f3d0" radius={[4,4,0,0]} maxBarSize={36} />
                <Bar dataKey="Done"  fill="#10b981" radius={[4,4,0,0]} maxBarSize={36} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Doctor performance chart ──────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Doctor Performance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Appointments per doctor in selected range</p>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
            {[['Completed','#10b981'],['Pending','#f59e0b'],['Cancelled','#ef4444']].map(([l,c]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </div>
        {docData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, docData.length * 48)}>
            <BarChart data={docData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
              onClick={e => setActiveDoc(e?.activePayload?.[0]?.payload?.id === activeDoc ? null : e?.activePayload?.[0]?.payload?.id)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0,0,0,0]} maxBarSize={28} />
              <Bar dataKey="Pending"   stackId="a" fill="#f59e0b" radius={[0,0,0,0]} maxBarSize={28} />
              <Bar dataKey="Cancelled" stackId="a" fill="#ef4444" radius={[4,4,4,4]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 4: Doctor table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-gray-50/60">
          <h3 className="font-bold text-gray-800 text-sm">Detailed Doctor Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b bg-gray-50/40">
                {['Doctor','Specialization','Total','Completed','Pending','Cancelled','Rate'].map(h => (
                  <th key={h} className={`px-4 py-2.5 font-semibold ${h === 'Total' || h === 'Completed' || h === 'Pending' || h === 'Cancelled' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docData.map((doc, i) => (
                <tr key={doc.id}
                  className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${activeDoc === doc.id ? 'bg-indigo-50/50' : ''}`}
                  onClick={() => setActiveDoc(activeDoc === doc.id ? null : doc.id)}>
                  <td className="px-4 py-3 font-semibold text-gray-800">Dr. {doc.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{byDoctor[i]?.specialization}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700">{doc.Total}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{doc.Completed}</td>
                  <td className="px-4 py-3 text-right text-amber-600 font-medium">{doc.Pending}</td>
                  <td className="px-4 py-3 text-right text-red-500">{doc.Cancelled}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${doc.rate}%`, background: doc.rate >= 70 ? '#10b981' : doc.rate >= 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-8 text-right"
                        style={{ color: doc.rate >= 70 ? '#059669' : doc.rate >= 40 ? '#d97706' : '#dc2626' }}>
                        {doc.rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
