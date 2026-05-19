import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getDoctors, getAppointments, updateAppointmentStatus } from '../../api';
import ConsultationModal from './ConsultationModal';
import { SkeletonRow, SkeletonStats } from '../../components/Skeleton';

// ── Doctor Chatbot ────────────────────────────────────────────────────────────
function DoctorChatbot({ doctor, appointments, date }) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    if (doctor) {
      setMessages([{
        role: 'bot',
        text: `Hi! I'm your assistant for today's clinic.\nAsk me about patients, queue status, or today's schedule.`,
      }]);
    }
  }, [doctor]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const stats = {
    waiting:     appointments.filter(a => a.status === 'waiting').length,
    in_progress: appointments.filter(a => a.status === 'in_progress').length,
    completed:   appointments.filter(a => a.status === 'completed').length,
    total:       appointments.length,
  };

  const respond = (msg) => {
    const q = msg.toLowerCase().trim();

    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste)/i.test(q))
      return `Hello, ${doctor?.name?.split(' ')[1] || 'Doctor'}! 👋\nToday you have ${stats.total} appointments — ${stats.waiting} waiting, ${stats.in_progress} in progress, ${stats.completed} completed.`;

    if (/summary|overview|today|status|stats/i.test(q))
      return `📊 Today (${date}):\n• Total: ${stats.total}\n• Waiting: ${stats.waiting}\n• In Progress: ${stats.in_progress}\n• Completed: ${stats.completed}`;

    if (/wait(ing)?|queue/i.test(q)) {
      const list = appointments.filter(a => a.status === 'waiting');
      if (!list.length) return '✅ No patients currently waiting!';
      return `⏳ ${list.length} waiting:\n${list.map(a => `• ${a.token_display} — ${a.patient?.name} (${a.time_slot})`).join('\n')}`;
    }

    if (/current|in.?progress|now serving|active/i.test(q)) {
      const cur = appointments.find(a => a.status === 'in_progress');
      if (!cur) return 'No patient currently in progress.';
      return `🔵 Now seeing:\n• ${cur.token_display} — ${cur.patient?.name}\n• Slot: ${cur.time_slot}\n• Phone: ${cur.patient?.phone}\n• ID: ${cur.patient?.patient_id}`;
    }

    if (/next|upcoming/i.test(q)) {
      const nxt = appointments.find(a => a.status === 'waiting');
      if (!nxt) return '✅ No more patients waiting!';
      return `➡️ Next patient:\n• ${nxt.token_display} — ${nxt.patient?.name}\n• Slot: ${nxt.time_slot}\n• Phone: ${nxt.patient?.phone}`;
    }

    if (/complet(ed)?|done|finish/i.test(q)) {
      const list = appointments.filter(a => a.status === 'completed');
      if (!list.length) return 'No completed appointments yet.';
      return `✅ ${list.length} completed:\n${list.map(a => `• ${a.token_display} — ${a.patient?.name}`).join('\n')}`;
    }

    if (/how many|count|total|number/i.test(q))
      return `📋 ${stats.total} appointments today:\n• ${stats.waiting} waiting\n• ${stats.in_progress} in progress\n• ${stats.completed} completed`;

    if (/time|clock/i.test(q))
      return `🕐 ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    if (/help|what can/i.test(q))
      return `I can help with:\n• Today's summary\n• Waiting / in-progress / completed patients\n• Next patient details\n• Patient name search\n• Quick queue stats`;

    // Patient name search
    const needle = q.replace(/patient|find|search|show|who is|details/gi, '').trim();
    if (needle.length >= 3) {
      const found = appointments.filter(a =>
        a.patient?.name?.toLowerCase().includes(needle)
      );
      if (found.length) {
        return `🔍 Found ${found.length} match(es):\n${found.map(a =>
          `• ${a.token_display} — ${a.patient?.name} [${a.status}] @ ${a.time_slot}`
        ).join('\n')}`;
      }
    }

    return `I'm not sure about that. Try:\n• "Today's summary"\n• "Who is waiting?"\n• "Current patient"\n• "Next patient"\n• Or type a patient name`;
  };

  const send = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: respond(msg) }]);
    }, 350);
  };

  const SUGGESTIONS = ["Today's summary", "Who's waiting?", "Current patient", "Next patient"];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Open assistant"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {!open && stats.waiting > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold leading-none">
            {stats.waiting}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] max-w-sm sm:max-w-none sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-up"
          style={{ height: 'min(480px, calc(100vh - 6rem))' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm">AI Assistant</div>
              <div className="text-white/70 text-xs truncate">{doctor?.name} · {doctor?.specialization}</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-xs">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/80">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all whitespace-nowrap">
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              className="flex-1 input py-2 text-sm"
              placeholder="Ask about patients, queue…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              autoFocus
            />
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function StatusBadge({ status }) {
  return <span className={`badge-${status}`}>{status.replace('_', ' ')}</span>;
}

export default function DoctorDashboard() {
  const { id } = useParams();
  const [doctor, setDoctor]           = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [date, setDate]               = useState(localDateStr());
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('waiting');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data: docs }, { data: apts }] = await Promise.all([
        getDoctors(),
        getAppointments({ date, doctor_id: id }),
      ]);
      const foundDoc = docs.find((d) => String(d.id) === String(id));
      // Only set doctor if we don't have it or if it changed to avoid resetting sub-components
      setDoctor(prev => {
        if (!prev || prev.id !== foundDoc?.id) return foundDoc;
        return prev;
      });
      setAppointments(apts);
    } catch (err) {
      console.error('Refresh error:', err);
    }
    if (!silent) setLoading(false);
  }, [id, date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tenantInfo = JSON.parse(localStorage.getItem('tenant_info') || '{}');
    const tenantId = tenantInfo.id || '';
    const socket = io('http://localhost:5000');
    socket.on(`token_update_${tenantId}`, (data) => {
      if (!data.doctor_id || String(data.doctor_id) === String(id)) {
        load(true); // Silent refresh
      }
    });
    // Auto-refresh every 30 seconds as a fallback
    const interval = setInterval(() => load(true), 30000);
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [id, load]);

  const stats = {
    waiting:     appointments.filter((a) => a.status === 'waiting').length,
    in_progress: appointments.filter((a) => a.status === 'in_progress').length,
    completed:   appointments.filter((a) => a.status === 'completed').length,
  };

  const visibleAppointments = statusFilter
    ? appointments.filter((a) => a.status === statusFilter)
    : appointments;

  const toggleFilter = (key) => setStatusFilter((prev) => (prev === key ? null : key));

  const startConsultation = async (apt) => {
    if (apt.status === 'waiting') {
      await updateAppointmentStatus(apt.id, 'in_progress');
      await load();
      setSelected({ ...apt, status: 'in_progress' });
    } else {
      setSelected(apt);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="animate-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/doctor" className="text-xs sm:text-sm text-white/80 hover:text-white transition inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            All Doctors
          </Link>
          <h1 className="page-title mt-1">{doctor?.name || '...'}</h1>
          <p className="page-sub">{doctor?.specialization}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/token/${id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs sm:text-sm"
          >
            📺 <span className="hidden sm:inline">Token Display</span>
            <span className="sm:hidden">Token</span>
          </a>
          <input
            type="date"
            className="input w-full sm:w-44 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats — click to filter appointments */}
      <div className="animate-fade-up delay-75">
        {loading ? <SkeletonStats /> : (
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
            {[
              { key: 'waiting',     label: 'Waiting',     count: stats.waiting,     color: 'text-yellow-700 bg-yellow-50/90 border-yellow-200', ring: 'ring-yellow-400' },
              { key: 'in_progress', label: 'In Progress', count: stats.in_progress, color: 'text-blue-700   bg-blue-50/90   border-blue-200',  ring: 'ring-blue-400'   },
              { key: 'completed',   label: 'Completed',   count: stats.completed,   color: 'text-green-700  bg-green-50/90  border-green-200', ring: 'ring-green-400'  },
            ].map((s, i) => (
              <button
                key={s.key}
                onClick={() => toggleFilter(s.key)}
                className={`rounded-3xl border p-4 sm:p-6 text-center animate-fade-up transition-all active:scale-95 hover:shadow-xl cursor-pointer flex flex-col items-center justify-center
                  ${s.color}
                  ${statusFilter === s.key ? `ring-2 ${s.ring} shadow-xl scale-[1.03]` : 'hover:scale-[1.02]'}`}
                style={{ animationDelay: `${i * 75}ms` }}
                title={`${statusFilter === s.key ? 'Clear' : 'Show'} ${s.label} filter`}
              >
                <div className="text-3xl sm:text-4xl font-black tabular-nums">{s.count}</div>
                <div className="text-xs sm:text-sm font-bold uppercase tracking-widest mt-1 opacity-80">{s.label}</div>
                {statusFilter === s.key && (
                  <div className="text-[10px] mt-2 font-black uppercase tracking-tighter bg-white/50 px-2 py-0.5 rounded-full">● Active Filter</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Appointments list */}
      <div className="card p-0 overflow-hidden animate-fade-up delay-150">
        <div className="px-4 py-3 border-b bg-white/30 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">
              Appointments — {date === localDateStr() ? 'Today' : date}
            </span>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
              >
                {statusFilter.replace('_', ' ')} ×
              </button>
            )}
          </div>
          <button
            onClick={load}
            className="text-blue-600 text-xs sm:text-sm hover:text-blue-800 transition flex items-center gap-1"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="divide-y">
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : visibleAppointments.length === 0 ? (
          <div className="py-12 sm:py-16 text-center animate-fade-in">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">
              {statusFilter ? `No ${statusFilter.replace('_', ' ')} appointments` : 'No appointments for this date'}
            </p>
            {statusFilter && (
              <button onClick={() => setStatusFilter(null)} className="mt-2 text-xs text-blue-600 hover:underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {visibleAppointments.map((apt, idx) => (
              <div
                key={apt.id}
                className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-blue-50/30 transition animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Token */}
                <div className="text-center w-12 sm:w-16 flex-shrink-0">
                  <div className="font-bold text-blue-700 text-sm sm:text-lg leading-tight">{apt.token_display}</div>
                  <div className="text-xs text-gray-400">#{apt.queue_position}</div>
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{apt.patient?.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    <span className="hidden sm:inline">{apt.patient?.patient_id} &bull; </span>
                    {apt.patient?.phone}
                    <span className="hidden xs:inline"> &bull; {apt.time_slot}</span>
                  </div>
                </div>

                {/* Status badge — hide on tiny screens */}
                <div className="hidden sm:block">
                  <StatusBadge status={apt.status} />
                </div>

                {/* Action button */}
                <div className="flex-shrink-0">
                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <button
                      onClick={() => startConsultation(apt)}
                      className={apt.status === 'waiting' ? 'btn-primary' : 'btn-secondary'}
                    >
                      {apt.status === 'waiting' ? 'Start' : 'Continue'}
                    </button>
                  )}
                  {apt.status === 'completed' && (
                    <button onClick={() => setSelected(apt)} className="btn-secondary">View Rx</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ConsultationModal
          appointment={selected}
          doctor={doctor}
          onClose={() => { setSelected(null); load(); }}
        />
      )}

      <DoctorChatbot doctor={doctor} appointments={appointments} date={date} />
    </div>
  );
}
