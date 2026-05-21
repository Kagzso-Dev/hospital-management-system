import React, { useState, useEffect, useCallback } from 'react';
import { listPayments, getPaymentSummary, getProcedureCharges, getAppointmentPrescription, listReceptionCharges } from '../../api';

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
  const [tab, setTab] = useState('collection');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [receptionCharges, setReceptionCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const [{ data: sum }, { data: rows }, { data: procs }, { data: rchrgs }] = await Promise.all([
        getPaymentSummary(d),
        listPayments({ date: d }),
        getProcedureCharges(d),
        listReceptionCharges(d),
      ]);
      setSummary(sum);
      setPayments(rows);
      setProcedures(procs);
      setReceptionCharges(rchrgs);
    } catch {
      setSummary(null);
      setPayments([]);
      setProcedures([]);
      setReceptionCharges([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const printBill = async (p) => {
    let procCharge = 0;
    let procLabel = '';
    try {
      const { data: rx } = await getAppointmentPrescription(p.appointment_id);
      if (rx && Number(rx.procedure_charge) > 0) {
        procCharge = Number(rx.procedure_charge);
        procLabel = rx.procedure_label || 'Procedure Charge';
      }
    } catch {}

    const hospitalName = localStorage.getItem('hospital_name') || 'Hospital Management';
    const tagline = localStorage.getItem('hospital_tagline') || '';
    const consultFee = Number(p.amount);
    const total = consultFee + procCharge;
    const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };

    const win = window.open('', '_blank', 'width=460,height=680');
    if (!win) { alert('Pop-up blocked. Allow pop-ups and try again.'); return; }
    win.document.write(`
      <html><head><title>Bill ${p.receipt_no}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#222;padding:24px}
        .box{max-width:400px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;padding:24px}
        .hdr{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:14px;margin-bottom:18px}
        .hname{font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
        .htag{font-size:11px;color:#6b7280;margin-top:3px}
        .info{display:flex;justify-content:space-between;margin-bottom:14px;font-size:12px;color:#374151}
        .patient-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:12px;margin-bottom:16px}
        .patient-box .row{display:flex;gap:20px;flex-wrap:wrap}
        .patient-box .row span{color:#6b7280}
        .patient-box .row strong{color:#111}
        table{width:100%;border-collapse:collapse;margin-bottom:0}
        thead tr{background:#1d4ed8;color:#fff}
        thead th{padding:8px 12px;font-size:12px;font-weight:700;text-align:left}
        thead th:last-child{text-align:right}
        tbody tr{border-bottom:1px solid #f3f4f6}
        tbody tr:nth-child(even){background:#f9fafb}
        td{padding:9px 12px;font-size:13px}
        td.desc{font-weight:500}
        td.amt{text-align:right;font-weight:600}
        tfoot tr{background:#1d4ed8;color:#fff}
        tfoot td{padding:10px 12px;font-weight:900;font-size:15px}
        tfoot td:last-child{text-align:right}
        .mode-row{display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px}
        .paid-badge{text-align:center;margin-top:12px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-weight:700;font-size:13px;padding:8px;border-radius:8px}
        .sig{margin-top:28px;text-align:right}
        .sig-line{display:inline-block;border-top:1px solid #9ca3af;padding-top:6px;width:160px;text-align:center;font-size:11px;color:#6b7280}
        .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px}
        .print-btn{display:block;width:100%;margin:18px 0 4px;padding:11px;background:#1d4ed8;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:8px;cursor:pointer}
        .print-btn:hover{background:#1e40af}
        @media print{.print-btn{display:none!important}body{padding:0}.box{border:none;border-radius:0}}
      </style></head><body>
      <div class="box">
        <div class="hdr">
          <div class="hname">${hospitalName}</div>
          ${tagline ? `<div class="htag">${tagline}</div>` : ''}
          <div class="htag" style="margin-top:6px;font-weight:600;color:#374151">Patient Bill</div>
        </div>
        <div class="info">
          <div><strong>Receipt:</strong> ${p.receipt_no}</div>
          <div><strong>Date:</strong> ${p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : ''}</div>
        </div>
        <div class="patient-box">
          <div class="row">
            <div><span>Patient: </span><strong>${p.patient_name || '—'}</strong></div>
            <div><span>ID: </span><strong>${p.patient_code || '—'}</strong></div>
          </div>
          <div class="row" style="margin-top:5px">
            <div><span>Doctor: </span><strong>${p.doctor_name}</strong></div>
            <div><span>Token: </span><strong>${p.token_display}</strong></div>
            ${p.time_slot ? `<div><span>Time: </span><strong>${p.time_slot}</strong></div>` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            ${[
              `<tr><td>1</td><td class="desc">Consultation Fee</td><td class="amt">₹${consultFee.toLocaleString('en-IN')}</td></tr>`,
              procCharge > 0 ? `<tr><td>2</td><td class="desc" style="color:#c2410c">${procLabel}</td><td class="amt" style="color:#c2410c">₹${procCharge.toLocaleString('en-IN')}</td></tr>` : '',
            ].join('')}
          </tbody>
          <tfoot><tr><td colspan="2">TOTAL</td><td>₹${total.toLocaleString('en-IN')}</td></tr></tfoot>
        </table>
        <div class="mode-row">
          <span>Payment Mode</span>
          <strong>${MODE_LABEL[p.payment_mode] || p.payment_mode}</strong>
        </div>
        ${p.transaction_ref ? `<div class="mode-row" style="margin-top:6px"><span>Ref</span><strong>${p.transaction_ref}</strong></div>` : ''}
        <div class="paid-badge">✓ PAYMENT RECEIVED</div>
        <div class="sig"><div class="sig-line">${p.doctor_name}<br/>Doctor's Signature</div></div>
        <div class="footer">This is a digitally generated bill. Please retain for your records.</div>
        <button class="print-btn" onclick="window.print()">🖨 Print</button>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
  };

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

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit">
        {[
          { key: 'collection', label: 'Collection' },
          { key: 'procedures', label: `Procedure Charges${(procedures.length + receptionCharges.length) > 0 ? ` (${procedures.length + receptionCharges.length})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl"/>)}
        </div>
      ) : tab === 'collection' ? (
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
                      <th className="px-4 py-3 font-semibold text-center">Bill</th>
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
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => printBill(p)}
                              title="Print Bill"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all"
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                              </svg>
                              Print
                            </button>
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
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Procedure Charges tab ── */
        <>
          {/* Summary banner */}
          {(() => {
            const docTotal = procedures.reduce((s, r) => s + Number(r.procedure_charge), 0);
            const recTotal = receptionCharges.reduce((s, r) => s + Number(r.amount), 0);
            const grandTotal = docTotal + recTotal;
            const totalCount = procedures.length + receptionCharges.length;
            return (
              <div className="card p-4 bg-gradient-to-br from-orange-500 to-amber-500 border-0 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Procedure Charges</div>
                  <div className="text-3xl font-black mt-1">₹{grandTotal.toLocaleString('en-IN')}</div>
                  <div className="text-xs opacity-70 mt-1">{totalCount} charge{totalCount !== 1 ? 's' : ''} · {fmtDate(date + 'T00:00:00')}</div>
                </div>
                <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            );
          })()}

          {/* Reception Charges (POS) table */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800 text-sm">Reception Charges (POS)</div>
                <div className="text-xs text-gray-400 mt-0.5">Standalone charges collected at reception (blood test, ECG, X-ray, dressing…)</div>
              </div>
              {receptionCharges.length > 0 && (
                <span className="text-sm font-black text-orange-600">
                  ₹{receptionCharges.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {receptionCharges.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No reception charges for {fmtDate(date + 'T00:00:00')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-orange-50 border-b border-orange-100">
                    <tr className="text-left text-xs text-orange-700">
                      <th className="px-4 py-3 font-semibold">Charge No</th>
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Procedure</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {receptionCharges.map((r, i) => {
                      const m = MODE_META[r.payment_mode] || { label: r.payment_mode, bg: 'bg-gray-100', text: 'text-gray-600' };
                      return (
                        <tr key={r.id} className={`hover:bg-orange-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.charge_no}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{r.patient_name}</div>
                            {r.patient_code && <div className="text-xs text-gray-400">{r.patient_code}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              {r.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
                              {m.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-orange-700">
                            ₹{Number(r.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">{fmtTime(r.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-orange-50 border-t-2 border-orange-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-orange-800">Total ({receptionCharges.length})</td>
                      <td className="px-4 py-3 text-right font-black text-orange-800 text-base">
                        ₹{receptionCharges.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('en-IN')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Doctor procedure charges table */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800 text-sm">Doctor Procedure Charges</div>
                <div className="text-xs text-gray-400 mt-0.5">Charges added by doctors during consultation (injections, IV drip, dressing…)</div>
              </div>
              {procedures.length > 0 && (
                <span className="text-sm font-black text-orange-600">
                  ₹{procedures.reduce((s, r) => s + Number(r.procedure_charge), 0).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {procedures.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No doctor procedure charges for {fmtDate(date + 'T00:00:00')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-orange-50 border-b border-orange-100">
                    <tr className="text-left text-xs text-orange-700">
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Doctor</th>
                      <th className="px-4 py-3 font-semibold">Token</th>
                      <th className="px-4 py-3 font-semibold">Procedure / Reason</th>
                      <th className="px-4 py-3 font-semibold text-right">Charge</th>
                      <th className="px-4 py-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {procedures.map((r, i) => (
                      <tr key={r.id} className={`hover:bg-orange-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{r.patient_name}</div>
                          <div className="text-xs text-gray-400">{r.patient_code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{r.doctor_name}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-blue-700 text-xs">{r.token_display || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            {r.procedure_label || 'Procedure'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-700">
                          ₹{Number(r.procedure_charge).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">{fmtTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-orange-50 border-t-2 border-orange-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-orange-800">Total ({procedures.length})</td>
                      <td className="px-4 py-3 text-right font-black text-orange-800 text-base">
                        ₹{procedures.reduce((s, r) => s + Number(r.procedure_charge), 0).toLocaleString('en-IN')}
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
