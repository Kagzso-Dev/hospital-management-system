import { useState } from 'react';
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
    sel: { bg: 'bg-emerald-50', border: 'border-emerald-400', label: 'text-emerald-600', sub: 'text-emerald-500', dot: 'bg-emerald-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-500', sub: 'text-gray-400' },
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
    sel: { bg: 'bg-violet-50', border: 'border-violet-400', label: 'text-violet-600', sub: 'text-violet-500', dot: 'bg-violet-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-500', sub: 'text-gray-400' },
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
    sel: { bg: 'bg-cyan-50', border: 'border-cyan-400', label: 'text-cyan-600', sub: 'text-cyan-500', dot: 'bg-cyan-500' },
    idle: { border: 'border-gray-200', label: 'text-gray-500', sub: 'text-gray-400' },
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

      {/* Booking summary */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0">
            {patient.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-sm sm:text-base truncate">{patient.name}</div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{patient.patient_id} · {appointment.date} · {appointment.time_slot}</div>
          </div>
          <div className="text-right flex-shrink-0 hidden xs:block">
            <div className="text-xs text-slate-400 font-medium">Doctor</div>
            <div className="font-semibold text-slate-700 text-sm truncate max-w-[120px]">{doctor?.name}</div>
            <div className="text-xs text-slate-400">{doctor?.specialization}</div>
          </div>
        </div>
      </div>

      {/* Fee banner */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Consultation Fee</div>
            <div className="text-3xl sm:text-4xl font-black text-slate-800 mt-1 tracking-tight">
              ₹{fee.toLocaleString('en-IN')}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-xs font-semibold whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            Pending
          </span>
        </div>
      </div>

      {/* Payment mode */}
      <div className="card p-4 space-y-3">
        <div className="text-sm font-bold text-slate-700">Payment Mode</div>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {MODES.map((m) => {
            const sel = mode === m.key;
            const c = sel ? m.sel : m.idle;
            return (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setTxRef(''); }}
                className={`relative flex flex-col items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 sm:px-2 rounded-xl border-2 transition-all duration-150 ${c.border} ${sel ? c.bg : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                {sel && <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${c.dot}`} />}
                <span className={c.label}>{m.icon}</span>
                <div>
                  <div className={`font-bold text-xs sm:text-sm ${c.label}`}>{m.label}</div>
                  <div className={`text-[9px] sm:text-[10px] leading-tight mt-0.5 ${c.sub} hidden xs:block`}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {(mode === 'upi' || mode === 'card') && (
          <div className="animate-fade-up">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {mode === 'upi' ? 'UPI Transaction ID' : 'Card Last 4 Digits'}
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 bg-white transition-all"
              placeholder={mode === 'upi' ? 'e.g. 412345678901' : 'e.g. 4242'}
              value={txRef}
              maxLength={mode === 'card' ? 4 : 30}
              inputMode={mode === 'card' ? 'numeric' : 'text'}
              onChange={(e) => setTxRef(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="card p-3 sm:p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs sm:text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{patient.name}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="hidden xs:inline">{doctor?.name}</span>
          <span className="hidden xs:inline mx-1.5 text-slate-300">·</span>
          <span className="font-semibold text-slate-700">{selectedMode?.label}</span>
        </div>
        <div className="font-black text-base sm:text-lg text-slate-800">₹{fee.toLocaleString('en-IN')}</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-3.5 sm:py-4 rounded-xl bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span className="hidden xs:inline">Confirm &amp; Generate Token · </span>₹{fee.toLocaleString('en-IN')}
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 pb-2">
        Payment will be recorded and token generated immediately
      </p>
    </div>
  );
}
