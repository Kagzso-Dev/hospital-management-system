import React, { useRef } from 'react';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };

export default function ReceiptView({ receipt, appointment, onNewBooking }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    // Include token in the printout for completeness
    const token = appointment?.token_display || receipt.token_display;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) {
      alert('Print window was blocked by your browser.');
      return;
    }
    
    const hospitalName = localStorage.getItem('hospital_name') || 'Hospital Clinic';
    const tagline = localStorage.getItem('hospital_tagline') || 'Your Health, Our Priority';
    
    win.document.write(`
      <html><head><title>Receipt ${receipt.receipt_no}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; color: #333; }
        .receipt-box { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .hospital-name { font-size: 22px; font-weight: bold; margin: 0; color: #111; text-transform: uppercase; letter-spacing: 1px; }
        .tagline { font-size: 12px; color: #666; margin-top: 4px; }
        .token-box { text-align: center; background: #f8f9fa; border: 2px dashed #ccc; padding: 10px; margin: 20px 0; border-radius: 8px; }
        .token-label { font-size: 11px; color: #666; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; }
        .token-val { font-size: 42px; font-weight: 900; color: #000; margin: 5px 0; line-height: 1; }
        .details { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .details td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .details tr:last-child td { border-bottom: none; }
        .label { color: #666; width: 40%; font-size: 13px; }
        .value { font-weight: 600; text-align: right; font-size: 14px; }
        .total-row td { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; margin-top: 5px; color: #000; }
        .footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; line-height: 1.5; }
        @media print { 
          body { padding: 0; }
          .receipt-box { border: none; box-shadow: none; padding: 0; max-width: 100%; } 
          .token-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f8f9fa !important; }
        }
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
        </div>

        <table class="details">
          <tr><td class="label">Receipt No</td><td class="value">${receipt.receipt_no}</td></tr>
          <tr><td class="label">Date</td><td class="value">${fmt(receipt.created_at)}</td></tr>
          <tr><td class="label">Patient</td><td class="value">${receipt.patient_name}</td></tr>
          <tr><td class="label">Patient ID</td><td class="value">${receipt.patient_code}</td></tr>
          <tr><td class="label">Doctor</td><td class="value">${receipt.doctor_name}</td></tr>
          <tr><td class="label">Payment Mode</td><td class="value">${MODE_LABEL[receipt.payment_mode] || receipt.payment_mode}</td></tr>
          ${receipt.transaction_ref ? `<tr><td class="label">Ref</td><td class="value">${receipt.transaction_ref}</td></tr>` : ''}
          <tr class="total-row"><td class="label">Consultation Fee</td><td class="value">₹${Number(receipt.amount).toLocaleString('en-IN')}</td></tr>
        </table>

        <div class="footer">
          <strong>Thank you for visiting!</strong><br/>
          Please wait for your token number to be called.
        </div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    
    // Some browsers need a slight delay to render before printing
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  return (
    <div className="max-w-sm mx-auto space-y-4 animate-fade-up">
      {/* Success banner */}
      <div className="text-center space-y-1 py-2">
        <div className="w-14 h-14 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-3 border border-green-500/30">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div className="font-bold text-xl text-green-400 drop-shadow-md">Payment Successful!</div>
        <div className="text-sm text-green-100/80">Token generated. Patient can proceed.</div>
      </div>

      {/* Token highlight */}
      <div className="card bg-blue-50 border-blue-200 text-center py-5">
        <div className="text-xs uppercase tracking-widest text-blue-500 font-semibold">Token Number</div>
        <div className="text-5xl font-black text-blue-700 my-2 tracking-wide">{appointment?.token_display || receipt.token_display}</div>
        <div className="text-xs text-blue-400">Queue Position #{appointment?.queue_position}</div>
      </div>

      {/* Printable receipt */}
      <div className="card text-sm space-y-1 font-mono" ref={printRef}>
        <div className="center bold" style={{ textAlign:'center', fontWeight:'bold', marginBottom:4 }}>
          ══ PAYMENT RECEIPT ══
        </div>
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Receipt No</span>
          <span className="font-semibold">{receipt.receipt_no}</span>
        </div>
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Date</span>
          <span>{fmt(receipt.created_at)}</span>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Patient</span>
          <span className="font-medium max-w-[160px] text-right">{receipt.patient_name}</span>
        </div>
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Patient ID</span>
          <span>{receipt.patient_code}</span>
        </div>
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Doctor</span>
          <span className="font-medium max-w-[160px] text-right">{receipt.doctor_name}</span>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Consultation</span>
          <span className="font-bold text-green-700">₹{Number(receipt.amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
          <span className="text-gray-500">Mode</span>
          <span className="font-semibold uppercase">{MODE_LABEL[receipt.payment_mode] || receipt.payment_mode}</span>
        </div>
        {receipt.transaction_ref && (
          <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
            <span className="text-gray-500">Ref</span>
            <span>{receipt.transaction_ref}</span>
          </div>
        )}
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-center text-xs text-gray-400 mt-1">Thank you for visiting!</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print Receipt
        </button>
        <button onClick={onNewBooking} className="flex-1 btn-primary py-2.5">
          New Patient
        </button>
      </div>
    </div>
  );
}
