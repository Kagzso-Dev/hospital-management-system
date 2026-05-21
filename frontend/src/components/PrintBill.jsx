import React from 'react';

const PrintBill = React.forwardRef(({ bill }, ref) => {
  const {
    doctor, patient, appointment,
    consultationFee, procedureCharge, procedureLabel,
    paymentStatus,
    hospitalName,
  } = bill;

  const lines = [
    { label: 'Consultation Fee', amount: Number(consultationFee || 0) },
    ...(Number(procedureCharge) > 0
      ? [{ label: procedureLabel?.trim() || 'Procedure Charge', amount: Number(procedureCharge) }]
      : []),
  ];
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const isPaid = paymentStatus === 'paid';

  return (
    <div ref={ref} className="print-area p-8 max-w-lg mx-auto font-sans text-gray-900">
      {/* Header */}
      <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
        <div className="text-2xl font-bold text-blue-800">
          🏥 {hospitalName || 'Hospital Management System'}
        </div>
        <div className="text-sm text-gray-500 mt-1">Patient Bill / Receipt</div>
      </div>

      {/* Doctor + Date */}
      <div className="flex justify-between mb-5">
        <div>
          <div className="font-bold text-lg text-blue-800">{doctor?.name}</div>
          <div className="text-sm text-gray-600">{doctor?.specialization}</div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Date: {appointment?.date || new Date().toLocaleDateString('en-IN')}</div>
          <div>Token: {appointment?.token_display}</div>
          {appointment?.time_slot && <div>Time: {appointment.time_slot}</div>}
        </div>
      </div>

      {/* Patient info */}
      <div className="bg-gray-50 rounded-lg p-3 mb-6 flex flex-wrap gap-4 text-sm">
        <div><span className="font-semibold">Patient:</span> {patient?.name}</div>
        <div><span className="font-semibold">ID:</span> {patient?.patient_id}</div>
        {patient?.gender && <div><span className="font-semibold">Gender:</span> {patient.gender}</div>}
        {patient?.age && <div><span className="font-semibold">Age:</span> {patient.age} yrs</div>}
      </div>

      {/* Bill line items */}
      <div className="mb-6">
        <div className="font-semibold text-gray-700 mb-2 text-base uppercase tracking-wide">Bill Details</div>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="text-left py-2 px-4 w-8">#</th>
              <th className="text-left py-2 px-4">Description</th>
              <th className="text-right py-2 px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2.5 px-4 text-gray-500">{i + 1}</td>
                <td className="py-2.5 px-4 font-medium">{line.label}</td>
                <td className="py-2.5 px-4 text-right">₹{line.amount.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-700 text-white">
              <td colSpan={2} className="py-3 px-4 font-black text-sm uppercase tracking-widest">
                Total
              </td>
              <td className="py-3 px-4 text-right font-black text-lg">
                ₹{total.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment status badge */}
      <div
        className={`text-center py-2.5 rounded-xl text-sm font-bold tracking-wide ${
          isPaid
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-amber-100 text-amber-700 border border-amber-200'
        }`}
      >
        {isPaid ? '✓ PAYMENT RECEIVED' : '⏳ PAYMENT PENDING — COLLECT AT COUNTER'}
      </div>

      <div className="mt-4 text-center text-xs text-gray-400 border-t pt-2">
        This is a digitally generated bill. Please retain for your records.
      </div>
    </div>
  );
});

PrintBill.displayName = 'PrintBill';
export default PrintBill;
