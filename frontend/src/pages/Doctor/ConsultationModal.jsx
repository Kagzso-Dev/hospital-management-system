import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  createPrescription, getPatientPrescriptions,
  updateAppointmentStatus, searchMedicines, getAppointmentPrescription,
  getMedicineDetails,
} from '../../api';
import PrintPrescription from '../../components/PrintPrescription';

function MedicineRow({ item, onChange, onRemove, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const debounceRef = useRef();

  const fetchSugg = async (val) => {
    if (val.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await searchMedicines(val);
      setSuggestions(data);
      setShowSugg(true);
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  const handleInputChange = (val) => {
    onChange('medicine_name', val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSugg(val), 300);
  };

  const selectMedicine = async (m) => {
    onChange('medicine_name', m.name);
    if (m.default_dosage) onChange('dosage', m.default_dosage);
    setShowSugg(false);
    setSuggestions([]);
    
    // Fetch full details from FDA (cached in backend)
    setLoading(true);
    try {
      const { data } = await getMedicineDetails(m.name);
      setDetails(data);
    } catch (e) {
      setDetails(null);
    }
    setLoading(false);
  };

  const nameInput = (
    <div className="relative flex-1 min-w-0">
      <div className="relative">
        <input
          className={`input text-sm w-full pr-8 ${loading ? 'opacity-70' : ''}`}
          placeholder="Medicine name"
          value={item.medicine_name}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSugg(false), 200)}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        {details && !loading && (
          <button
            type="button"
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {!disabled && showSugg && suggestions.length > 0 && (
        <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-full mt-1 max-h-56 overflow-y-auto overflow-x-hidden animate-fade-in">
          {suggestions.map((m, idx) => (
            <button
              key={`${m.name}-${idx}`}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between border-b last:border-0 border-gray-50 transition-colors"
              onMouseDown={() => selectMedicine(m)}
            >
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 truncate">{m.name}</div>
                <div className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{m.generic_name || 'Medicine'}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                m.category === 'FDA Result' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                {m.category || 'Local'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Details Tooltip */}
      {showDetails && details && (
        <div className="absolute z-[60] bg-gray-900 text-white p-4 rounded-xl shadow-2xl w-72 xs:w-80 -top-2 left-0 -translate-y-full animate-scale-in border border-gray-700">
          <div className="space-y-3 text-xs">
            <div className="border-b border-gray-700 pb-1.5">
              <div className="font-bold text-sm text-blue-400">{details.name}</div>
              <div className="text-gray-400 italic">{details.generic_name || "No generic name available"}</div>
            </div>
            <div>
              <div className="font-bold text-gray-300 uppercase tracking-tighter mb-0.5">Indications & Usage</div>
              <p className="text-gray-400 line-clamp-3">{details.usage || "Not available"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-bold text-gray-300 uppercase tracking-tighter mb-0.5">Side Effects</div>
                <p className="text-gray-400 line-clamp-2">{details.side_effects || "Not available"}</p>
              </div>
              <div>
                <div className="font-bold text-red-400 uppercase tracking-tighter mb-0.5">Warnings</div>
                <p className="text-red-300 line-clamp-2">{details.warnings || "None listed"}</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-4 w-4 h-4 bg-gray-900 rotate-45 border-r border-b border-gray-700" />
        </div>
      )}
    </div>
  );

  const checkboxes = (
    <div className="flex gap-2 items-center flex-shrink-0">
      {['morning', 'afternoon', 'night'].map((t) => (
        <label key={t} className={`flex items-center gap-1 text-xs ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
          <input type="checkbox" className="rounded" checked={!!item[t]} disabled={disabled}
            onChange={(e) => onChange(t, e.target.checked)} />
          {t[0].toUpperCase()}
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 sm:bg-transparent sm:p-0 sm:border-0 sm:space-y-2">
      {/* Row 1: name + dosage */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-start">
        {nameInput}
        <div className="flex gap-2">
          <div className="flex-1 sm:w-24 sm:flex-shrink-0">
            <input className="input text-sm" placeholder="Dosage" value={item.dosage} disabled={disabled}
              onChange={(e) => onChange('dosage', e.target.value)} />
          </div>
          {!disabled && (
            <button type="button" onClick={onRemove}
              className="sm:hidden flex-shrink-0 text-red-500 hover:text-red-700 w-11 h-11 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: M/A/N + days + delete (desktop) */}
      <div className="flex items-center justify-between sm:justify-start gap-3 pl-0">
        <div className="flex-1 sm:flex-none">
          {checkboxes}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 sm:w-16 flex-shrink-0">
            <div className="relative">
              <input type="number" className="input text-sm pr-7" placeholder="Days" value={item.duration} disabled={disabled}
                onChange={(e) => onChange('duration', e.target.value)} min="1" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">D</span>
            </div>
          </div>
          {!disabled && (
            <button type="button" onClick={onRemove}
              className="hidden sm:flex text-gray-400 hover:text-red-600 transition-colors p-1"
              title="Remove medicine">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientHistory({ patientId, refreshKey }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (patientId) getPatientPrescriptions(patientId).then(({ data }) => setHistory(data));
  }, [patientId, refreshKey]);

  if (history.length === 0) return <div className="text-sm text-gray-400 text-center py-8">No previous visits</div>;

  return (
    <div className="space-y-3 overflow-y-auto max-h-96">
      {history.map((rx) => (
        <div key={rx.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {rx.appointment?.date}
            </span>
            <span className="text-xs text-gray-500">{rx.doctor?.name}</span>
          </div>
          {rx.diagnosis && (
            <p className="text-xs text-gray-700 mb-2"><span className="font-medium">Dx:</span> {rx.diagnosis}</p>
          )}
          {rx.items?.length > 0 && (
            <div className="space-y-1">
              {rx.items.map((item, i) => (
                <div key={i} className="text-xs text-gray-600">
                  {i + 1}. {item.medicine_name} {item.dosage} —{' '}
                  {[item.morning && 'M', item.afternoon && 'A', item.night && 'N'].filter(Boolean).join('-')}
                  {item.duration ? ` — ${item.duration}d` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const emptyItem = () => ({
  medicine_name: '', dosage: '', morning: false, afternoon: false, night: false, duration: '', instructions: '',
});

export default function ConsultationModal({ appointment, doctor, onClose }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [savedRx, setSavedRx] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const printRef = useRef();

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const isCompleted = appointment.status === 'completed';

  // Load existing prescription when viewing a completed appointment
  useEffect(() => {
    if (!isCompleted) return;
    getAppointmentPrescription(appointment.id).then(({ data: rx }) => {
      if (!rx) return;
      setDiagnosis(rx.diagnosis || '');
      setNotes(rx.notes || '');
      setItems(rx.items?.length
        ? rx.items.map((i) => ({
            medicine_name: i.medicine_name,
            dosage: i.dosage || '',
            morning: Boolean(i.morning),
            afternoon: Boolean(i.afternoon),
            night: Boolean(i.night),
            duration: i.duration != null ? String(i.duration) : '',
            instructions: i.instructions || '',
          }))
        : [emptyItem()]
      );
      setSavedRx({ ...rx, doctor, patient: appointment.patient, appointment });
    });
  }, [appointment.id, isCompleted]);

  const updateItem = (idx, field, val) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const saveAndComplete = async () => {
    setSaving(true);
    try {
      const filledItems = items.filter((i) => i.medicine_name.trim());
      const { data: rx } = await createPrescription({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id || doctor?.id,
        patient_id: appointment.patient_id || appointment.patient?.id,
        diagnosis,
        notes,
        items: filledItems,
      });
      await updateAppointmentStatus(appointment.id, 'completed');
      setSavedRx({ ...rx, doctor, patient: appointment.patient, appointment });
      setHistoryKey((k) => k + 1);
      // Auto-close after 1 second so user sees success feedback
      setTimeout(onClose, 1200);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4">
        <div className="flex items-start justify-between px-4 sm:px-6 py-3 sm:py-4 border-b gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {isCompleted ? 'Prescription (Read-only)' : 'Consultation'}
            </h2>
            <div className="text-xs sm:text-sm text-gray-500 truncate">
              {appointment.patient?.name} &bull; {appointment.token_display} &bull; {appointment.time_slot}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {savedRx && (
              <button onClick={handlePrint} className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">🖨 Print Rx</span>
                <span className="sm:hidden">🖨</span>
              </button>
            )}
            <button onClick={onClose} className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">Close</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x min-h-96">
          <div className="flex-1 p-4 sm:p-5 space-y-4">
            <div>
              <label className="label">Diagnosis</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Enter diagnosis..."
                value={diagnosis}
                disabled={!!savedRx}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Medicines</label>
                <div className="hidden sm:flex gap-2 text-xs text-gray-400 flex-1 ml-4">
                  <span className="flex-1 min-w-0">Name</span>
                  <span className="w-24">Dosage</span>
                  <span className="w-20">M / A / N</span>
                  <span className="w-14">Days</span>
                  <span className="w-6" />
                </div>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <MedicineRow
                    key={i}
                    item={item}
                    disabled={!!savedRx}
                    onChange={(field, val) => updateItem(i, field, val)}
                    onRemove={() => removeItem(i)}
                  />
                ))}
              </div>
              {!savedRx && (
                <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600 hover:underline">
                  + Add Medicine
                </button>
              )}
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Additional notes..."
                value={notes}
                disabled={!!savedRx}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {!savedRx ? (
              <button className={`w-full flex items-center justify-center gap-2 transition-all ${saving ? 'bg-blue-600' : 'btn-success'}`} onClick={saveAndComplete} disabled={saving}>
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Saving...
                  </>
                ) : '✓ Save & Complete'}
              </button>
            ) : (
              <div className="text-center py-2 text-green-700 bg-green-50 rounded-lg text-sm font-medium">
                ✓ Consultation completed
              </div>
            )}
          </div>

          <div className="lg:w-72 xl:w-80 p-4 sm:p-5 flex-shrink-0">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Patient History</h3>
            <PatientHistory
              patientId={appointment.patient?.id || appointment.patient_id}
              refreshKey={historyKey}
            />
          </div>
        </div>
      </div>

      {savedRx && (
        <div className="hidden">
          <PrintPrescription ref={printRef} prescription={savedRx} />
        </div>
      )}
    </div>
  );
}
