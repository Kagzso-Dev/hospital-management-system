import React from 'react';

const PrintPrescription = React.forwardRef(({ prescription }, ref) => {
  const { doctor, patient, appointment, diagnosis, notes, items, procedure_charge, procedure_label } = prescription;

  const timing = (item) =>
    [item.morning && 'Morning', item.afternoon && 'Afternoon', item.night && 'Night']
      .filter(Boolean).join(' - ') || '-';

  return (
    <div ref={ref} className="print-area p-8 max-w-2xl mx-auto font-sans text-gray-900">
      <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
        <div className="text-2xl font-bold text-blue-800">🏥 Hospital Management System</div>
        <div className="text-sm text-gray-500 mt-1">Digital Prescription</div>
      </div>

      <div className="flex justify-between mb-6">
        <div>
          <div className="font-bold text-lg text-blue-800">{doctor?.name}</div>
          <div className="text-sm text-gray-600">{doctor?.specialization}</div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Date: {appointment?.date || new Date().toLocaleDateString()}</div>
          <div>Time: {appointment?.time_slot}</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-6 flex gap-6 text-sm">
        <div><span className="font-medium">Patient:</span> {patient?.name}</div>
        <div><span className="font-medium">ID:</span> {patient?.patient_id}</div>
        <div><span className="font-medium">Gender:</span> {patient?.gender}</div>
        {patient?.age && <div><span className="font-medium">Age:</span> {patient.age} yrs</div>}
      </div>

      {diagnosis && (
        <div className="mb-4">
          <div className="font-semibold text-gray-700 mb-1">Diagnosis</div>
          <div className="text-sm text-gray-800 bg-blue-50 p-2 rounded">{diagnosis}</div>
        </div>
      )}

      {items?.length > 0 && (
        <div className="mb-4">
          <div className="font-semibold text-gray-700 mb-2 text-lg">℞ Prescription</div>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="text-left py-2 px-3 w-8">#</th>
                <th className="text-left py-2 px-3">Medicine</th>
                <th className="text-left py-2 px-3">Dosage</th>
                <th className="text-left py-2 px-3">Timing</th>
                <th className="text-left py-2 px-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-3 font-medium">{item.medicine_name}</td>
                  <td className="py-2 px-3">{item.dosage || '-'}</td>
                  <td className="py-2 px-3">{timing(item)}</td>
                  <td className="py-2 px-3">{item.duration ? `${item.duration} days` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Number(procedure_charge) > 0 && (
        <div className="mb-4 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
          <div>
            <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-0.5">Procedure Charge</div>
            <div className="text-sm text-gray-700">{procedure_label || 'Additional Procedure'}</div>
          </div>
          <div className="text-lg font-black text-orange-700">
            ₹{Number(procedure_charge).toLocaleString('en-IN')}
          </div>
        </div>
      )}

      {notes && (
        <div className="mb-8">
          <div className="font-semibold text-gray-700 mb-1">Notes</div>
          <div className="text-sm text-gray-700">{notes}</div>
        </div>
      )}

      <div className="mt-12 flex justify-end">
        <div className="text-center border-t border-gray-400 pt-2 w-48">
          <div className="text-sm text-gray-600">{doctor?.name}</div>
          <div className="text-xs text-gray-400">{doctor?.specialization}</div>
          <div className="text-xs text-gray-400">Doctor's Signature</div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400 border-t pt-2">
        This is a digitally generated prescription. Valid only with doctor's authentication.
      </div>
    </div>
  );
});

PrintPrescription.displayName = 'PrintPrescription';
export default PrintPrescription;
