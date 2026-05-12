import React, { useState, useEffect, useCallback } from 'react';
import { listPayments, getPaymentSummary } from '../../api';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const MODE_META = {
  cash: { label: 'Cash',  bg: 'bg-emerald-100', text: 'text-emerald-700', barColor: '#10b981' },
  upi:  { label: 'UPI',   bg: 'bg-violet-100',  text: 'text-violet-700',  barColor: '#8b5cf6' },
  card: { label: 'Card',  bg: 'bg-blue-100',    text: 'text-blue-700',    barColor: '#3b82f6' },
};

function ModeBar({ label, amount, total, color }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">₹{Number(amount).toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-gray-400 text-right">{pct}%</div>
    </div>
  );
}

export default function CollectionReport() {
  const [date, setDate] = useState(localToday());
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const [{ data: sum }, { data: rows }] = await Promise.all([
        getPaymentSummary(d),
        listPayments({ date: d }),
      ]);
      setSummary(sum);
      setPayments(rows);
    } catch {
      setSummary(null);
      setPayments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.patient_name?.toLowerCase().includes(q) ||
      p.doctor_name?.toLowerCase().includes(q) ||
      p.receipt_no?.toLowerCase().includes(q) ||
      p.token_display?.toLowerCase().includes(q)
    );
  });

  const total = Number(summary?.total_amount || 0);
  const cash  = Number(summary?.cash_amount  || 0);
  const upi   = Number(summary?.upi_amount   || 0);
  const card  = Number(summary?.card_amount  || 0);
  const count = Number(summary?.total_count  || 0);

  return (
    <div className="space-y-4 animate-fade-up">

      {/* Date picker + refresh */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-gray-400 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Collection Date</label>
        </div>
        <input
          type="date"
          value={date}
          max={localToday()}
          onChange={e => setDate(e.target.value)}
          className="input text-sm w-full sm:w-40"
        />
        <div className="flex gap-2 flex-wrap">
          {[['Today', localToday()], ['Yesterday', (() => { const d = new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()]].map(([lbl, val]) => (
            <button key={lbl} onClick={() => setDate(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${date === val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => load(date)} className="ml-auto btn-secondary text-sm flex items-center gap-1.5 py-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl"/>)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 col-span-2 sm:col-span-1 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
              <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Total Collection</div>
              <div className="text-3xl font-black mt-1">₹{total.toLocaleString('en-IN')}</div>
              <div className="text-xs opacity-70 mt-1">{count} payment{count !== 1 ? 's' : ''} · {fmtDate(date + 'T00:00:00')}</div>
            </div>
            {[
              { key: 'cash', amount: cash, count: payments.filter(p=>p.payment_mode==='cash').length },
              { key: 'upi',  amount: upi,  count: payments.filter(p=>p.payment_mode==='upi').length  },
              { key: 'card', amount: card, count: payments.filter(p=>p.payment_mode==='card').length  },
            ].map(({ key, amount, count: c }) => {
              const m = MODE_META[key];
              return (
                <div key={key} className="card p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>{m.label}</span>
                    <span className="text-xs text-gray-400">{c} txn</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">₹{Number(amount).toLocaleString('en-IN')}</div>
                </div>
              );
            })}
          </div>

          {/* Mode breakdown bars */}
          {total > 0 && (
            <div className="card p-5 space-y-4">
              <div className="text-sm font-bold text-gray-700">Breakdown by Mode</div>
              <ModeBar label="Cash" amount={cash} total={total} color={MODE_META.cash.barColor} />
              <ModeBar label="UPI"  amount={upi}  total={total} color={MODE_META.upi.barColor}  />
              <ModeBar label="Card" amount={card} total={total} color={MODE_META.card.barColor}  />
            </div>
          )}

          {/* Transactions table */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="font-bold text-gray-800 text-sm">
                Transactions
                {filtered.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{filtered.length} records</span>}
              </div>
              <div className="sm:ml-auto relative max-w-xs">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                <input
                  className="input pl-8 text-sm py-1.5"
                  placeholder="Search patient, doctor, receipt…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="text-gray-500 text-sm font-medium">No payments recorded</div>
                <div className="text-gray-400 text-xs mt-1">for {fmtDate(date + 'T00:00:00')}</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-3 font-semibold">Receipt</th>
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Doctor</th>
                      <th className="px-4 py-3 font-semibold">Token</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p, i) => {
                      const m = MODE_META[p.payment_mode] || { label: p.payment_mode, bg: 'bg-gray-100', text: 'text-gray-600' };
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.receipt_no}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{p.patient_name}</div>
                            <div className="text-xs text-gray-400">{p.patient_code}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.doctor_name}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-blue-700 text-xs">{p.token_display}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
                              {m.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {fmtTime(p.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">
                        Total ({filtered.length} payments)
                      </td>
                      <td className="px-4 py-3 text-right font-black text-gray-900 text-base">
                        ₹{filtered.reduce((s, p) => s + Number(p.amount), 0).toLocaleString('en-IN')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
