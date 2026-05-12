import React, { useState } from 'react';
import { createPayment } from '../../api';

const MODES = [
  {
    key: 'cash',
    label: 'Cash',
    desc: 'Collect cash directly',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="12" cy="12" r="3"/>
        <path strokeLinecap="round" d="M6 12h.01M18 12h.01"/>
      </svg>
    ),
    sel: { bg: 'bg-emerald-50', border: 'border-emerald-500', label: 'text-emerald-700', sub: 'text-emerald-500', dot: 'bg-emerald-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-700', sub: 'text-gray-400' },
  },
  {
    key: 'upi',
    label: 'UPI',
    desc: 'GPay, PhonePe, Paytm',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    sel: { bg: 'bg-violet-50', border: 'border-violet-500', label: 'text-violet-700', sub: 'text-violet-500', dot: 'bg-violet-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-700', sub: 'text-gray-400' },
  },
  {
    key: 'card',
    label: 'Card',
    desc: 'Debit / Credit card',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path strokeLinecap="round" d="M2 10h20"/>
        <path strokeLinecap="round" strokeWidth="2.2" d="M6 15h4"/>
      </svg>
    ),
    sel: { bg: 'bg-blue-50', border: 'border-blue-500', label: 'text-blue-700', sub: 'text-blue-500', dot: 'bg-blue-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-700', sub: 'text-gray-400' },
  },
];

export default function PaymentStep({ appointment, patient, doctor, onPaid }) {
  const fee = Number(doctor?.consultation_fee ?? 300);
  const [mode, setMode] = useState('cash');
  const [txRef, setTxRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await createPayment({
        appointment_id: appointment.id,
        patient_id: patient.id,
        amount: fee,
        payment_mode: mode,
        transaction_ref: txRef || undefined,
      });
      onPaid(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    }
    setLoading(false);
  };

  const selectedMode = MODES.find(m => m.key === mode);

  return (
    <div className="max-w-lg mx-auto space-y-3 animate-fade-up">

      {/* ── Booking summary ── */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
            {patient.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-base truncate">{patient.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{patient.patient_id} · {appointment.date} · {appointment.time_slot}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-400">Doctor</div>
            <div className="font-semibold text-gray-800 text-sm truncate max-w-[120px]">{doctor?.name}</div>
            <div className="text-xs text-gray-400">{doctor?.specialization}</div>
          </div>
        </div>
      </div>

      {/* ── Fee banner ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Consultation Fee</div>
            <div className="text-4xl font-black text-gray-900 mt-1 tracking-tight">
              ₹{fee.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Payment Pending
            </span>
          </div>
        </div>
      </div>

      {/* ── Payment mode ── */}
      <div className="card p-4 space-y-3">
        <div className="text-sm font-bold text-gray-700">Payment Mode</div>

        <div className="grid grid-cols-3 gap-2.5">
          {MODES.map((m) => {
            const sel = mode === m.key;
            const c = sel ? m.sel : m.idle;
            return (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setTxRef(''); }}
                className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all duration-150 ${c.border} ${sel ? c.bg : 'bg-white hover:bg-gray-50'}`}
              >
                {/* Selected dot indicator */}
                {sel && (
                  <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${c.dot}`} />
                )}
                <span className={sel ? c.label : 'text-gray-400'}>
                  {m.icon}
                </span>
                <div>
                  <div className={`font-bold text-sm ${c.label}`}>{m.label}</div>
                  <div className={`text-[10px] leading-tight mt-0.5 ${c.sub}`}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Reference field */}
        {(mode === 'upi' || mode === 'card') && (
          <div className="animate-fade-up">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {mode === 'upi' ? 'UPI Transaction ID' : 'Card Last 4 Digits'}
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              className="input text-sm"
              placeholder={mode === 'upi' ? 'e.g. 412345678901' : 'e.g. 4242'}
              value={txRef}
              maxLength={mode === 'card' ? 4 : 30}
              inputMode={mode === 'card' ? 'numeric' : 'text'}
              onChange={(e) => setTxRef(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Summary row ── */}
      <div className="card p-4 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{patient.name}</span>
          <span className="mx-1.5 text-gray-300">·</span>
          <span>{doctor?.name}</span>
          <span className="mx-1.5 text-gray-300">·</span>
          <span className="font-semibold">{selectedMode?.label}</span>
        </div>
        <div className="font-black text-lg text-gray-900">₹{fee.toLocaleString('en-IN')}</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Confirm button ── */}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-base transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            Processing Payment...
          </>
        ) : (
          <>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Confirm &amp; Generate Token · ₹{fee.toLocaleString('en-IN')}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 pb-2">
        Payment will be recorded and token generated immediately
      </p>
    </div>
  );
}
