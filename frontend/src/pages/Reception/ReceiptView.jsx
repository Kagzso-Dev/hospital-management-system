import React, { useRef } from 'react';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };

export default function ReceiptView({ receipt, appointment, onNewBooking }) {
  const printRef = useRef();

  const handlePrint = () => {
    const isPending = !receipt;
    const token = appointment?.token_display || receipt?.token_display;
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) { alert('Print window was blocked by your browser.'); return; }

    const hospitalName = localStorage.getItem('hospital_name') || 'Hospital Clinic';
    const tagline = localStorage.getItem('hospital_tagline') || 'Your Health, Our Priority';
    const docTitle = isPending ? `Token ${token}` : `Receipt ${receipt.receipt_no}`;

    const apptDateFmt = appointment?.date ? fmt(appointment.date + 'T00:00:00') : '';
    const detailRows = isPending
      ? `
          <tr><td class="lbl">Appt Date</td><td class="val">${apptDateFmt}</td></tr>
          <tr><td class="lbl">Time Slot</td><td class="val">${appointment?.time_slot || ''}</td></tr>
          <tr><td class="lbl">Patient</td><td class="val">${appointment?.patient?.name || ''}</td></tr>
          <tr><td class="lbl">Patient ID</td><td class="val">${appointment?.patient?.patient_id || ''}</td></tr>
          <tr><td class="lbl">Doctor</td><td class="val">${appointment?.doctor?.name || ''}</td></tr>
          <tr class="total-row"><td class="lbl">Payment</td><td class="val" style="color:#d97706">COLLECT AT COUNTER</td></tr>
        `
      : `
          <tr><td class="lbl">Receipt No</td><td class="val">${receipt.receipt_no}</td></tr>
          <tr><td class="lbl">Appt Date</td><td class="val">${receipt.date ? fmt(receipt.date + 'T00:00:00') : fmt(receipt.created_at)}</td></tr>
          <tr><td class="lbl">Time Slot</td><td class="val">${receipt.time_slot || appointment?.time_slot || ''}</td></tr>
          <tr><td class="lbl">Patient</td><td class="val">${receipt.patient_name}</td></tr>
          <tr><td class="lbl">Patient ID</td><td class="val">${receipt.patient_code}</td></tr>
          <tr><td class="lbl">Doctor</td><td class="val">${receipt.doctor_name}</td></tr>
          <tr><td class="lbl">Payment Mode</td><td class="val">${MODE_LABEL[receipt.payment_mode] || receipt.payment_mode}</td></tr>
          ${receipt.transaction_ref ? `<tr><td class="lbl">Ref</td><td class="val">${receipt.transaction_ref}</td></tr>` : ''}
          <tr class="total-row"><td class="lbl">Consultation Fee</td><td class="val">₹${Number(receipt.amount).toLocaleString('en-IN')}</td></tr>
        `;

    win.document.write(`
      <html><head><title>${docTitle}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; color: #333; }
        .receipt-box { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .hospital-name { font-size: 20px; font-weight: bold; margin: 0; color: #111; text-transform: uppercase; letter-spacing: 1px; }
        .tagline { font-size: 12px; color: #666; margin-top: 4px; }
        .token-box { text-align: center; background: #f8f9fa; border: 2px dashed #ccc; padding: 10px; margin: 20px 0; border-radius: 8px; }
        .token-label { font-size: 11px; color: #666; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; }
        .token-val { font-size: 42px; font-weight: 900; color: #000; margin: 5px 0; line-height: 1; }
        .pending-badge { display: inline-block; background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; margin-top: 6px; }
        .details { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .details td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .details tr:last-child td { border-bottom: none; }
        .lbl { color: #666; width: 45%; font-size: 13px; }
        .val { font-weight: 600; text-align: right; font-size: 14px; }
        .total-row td { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; }
        .footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
        .print-btn { display:block; width:100%; margin:18px 0 4px; padding:11px; background:#2563eb; color:#fff; font-size:15px; font-weight:700; border:none; border-radius:8px; cursor:pointer; letter-spacing:.3px; }
        .print-btn:hover { background:#1d4ed8; }
        @media print { .print-btn { display:none !important; } body { padding: 0; } .receipt-box { border: none; box-shadow: none; padding: 0; max-width: 100%; } }
      </style>
      </head><body>
      <div class="receipt-box">
        <div class="header">
          <h1 class="hospital-name">${hospitalName}</h1>
          <div class="tagline">${tagline}</div>
        </div>
        <div class="token-box">
          <div class="token-label">Queue Token</div>
          <div class="token-val">${token}</div>
          ${isPending ? '<div class="pending-badge">⏳ Payment Pending</div>' : ''}
        </div>
        <table class="details">${detailRows}</table>
        <div class="footer"><strong>Thank you for visiting!</strong><br/>Please wait for your token number to be called.</div>
        <button class="print-btn" onclick="window.print()">🖨 Print</button>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
  };

  const isPending = !receipt;

  return (
    <div className="max-w-sm mx-auto space-y-4 animate-fade-up px-1">
      {/* Success banner */}
      <div className="text-center space-y-1 py-2">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 border-2 ${
          isPending
            ? 'bg-amber-800 text-amber-300 border-amber-600'
            : 'bg-green-800 text-green-300 border-green-600'
        }`}>
          {isPending ? (
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
        <div className={`font-bold text-lg sm:text-xl drop-shadow-md ${isPending ? 'text-amber-400' : 'text-green-400'}`}>
          {isPending ? 'Token Issued — Payment Pending' : 'Payment Successful!'}
        </div>
        <div className="text-sm text-white/60">
          {isPending ? 'Collect payment at counter before/after consultation.' : 'Token generated. Patient can proceed.'}
        </div>
      </div>

      {/* Token highlight */}
      <div className={`card text-center py-5 ${isPending ? 'border-amber-400/20 bg-amber-500/10' : 'border-cyan-400/20 bg-cyan-500/10'}`}>
        <div className={`text-xs uppercase tracking-widest font-semibold ${isPending ? 'text-amber-400/80' : 'text-cyan-400/80'}`}>Token Number</div>
        <div className={`text-5xl sm:text-6xl font-black my-2 tracking-wide ${isPending ? 'text-amber-300' : 'text-cyan-300'}`}>
          {appointment?.token_display}
        </div>
        <div className={`text-xs ${isPending ? 'text-amber-400/60' : 'text-cyan-400/60'}`}>
          Queue Position #{appointment?.queue_position}
        </div>
        {isPending && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            Payment Pending
          </div>
        )}
      </div>

      {/* Receipt details */}
      <div className="card text-sm space-y-1.5 font-mono" ref={printRef}>
        <div className="text-center font-bold text-slate-500 text-xs tracking-widest mb-2">
          {isPending ? '══ TOKEN SLIP ══' : '══ PAYMENT RECEIPT ══'}
        </div>

        {!isPending && (
          <>
            {[
              { label: 'Receipt No', value: receipt.receipt_no },
              { label: 'Appt Date',  value: fmt(receipt.date ? receipt.date + 'T00:00:00' : receipt.created_at) },
              { label: 'Time Slot',  value: receipt.time_slot || appointment?.time_slot },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex justify-between gap-2">
                <span className="text-slate-500">{r.label}</span>
                <span className="text-slate-800 font-semibold text-right">{r.value}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-slate-200 my-2" />
          </>
        )}

        {isPending && (
          <>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Appt Date</span>
              <span className="text-slate-800 font-semibold">{appointment?.date ? fmt(appointment.date + 'T00:00:00') : ''}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Time Slot</span>
              <span className="text-slate-800 font-semibold">{appointment?.time_slot || ''}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-2" />
          </>
        )}

        {[
          { label: 'Patient',    value: isPending ? appointment?.patient?.name  : receipt.patient_name },
          { label: 'Patient ID', value: isPending ? appointment?.patient?.patient_id : receipt.patient_code },
          { label: 'Doctor',     value: isPending ? appointment?.doctor?.name   : receipt.doctor_name },
        ].filter(r => r.value).map(r => (
          <div key={r.label} className="flex justify-between gap-2">
            <span className="text-slate-500 flex-shrink-0">{r.label}</span>
            <span className="text-slate-700 font-medium text-right max-w-[160px] truncate">{r.value}</span>
          </div>
        ))}

        <div className="border-t border-dashed border-slate-200 my-2" />

        {!isPending ? (
          <>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Consultation</span>
              <span className="font-bold text-green-600">₹{Number(receipt.amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Mode</span>
              <span className="font-semibold text-slate-800 uppercase">{MODE_LABEL[receipt.payment_mode] || receipt.payment_mode}</span>
            </div>
            {receipt.transaction_ref && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Ref</span>
                <span className="text-slate-700">{receipt.transaction_ref}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Payment</span>
            <span className="font-bold text-amber-600 uppercase">Collect at Counter</span>
          </div>
        )}

        <div className="border-t border-dashed border-slate-200 my-2" />
        <div className="text-center text-xs text-slate-400 mt-1">Thank you for visiting!</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 text-white/70 font-medium text-sm hover:bg-white/10 transition-all"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print
        </button>
        <button onClick={onNewBooking} className="flex-1 btn-primary py-2.5">New Patient</button>
      </div>
    </div>
  );
}
