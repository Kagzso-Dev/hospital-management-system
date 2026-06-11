import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  createPrescription, getPatientPrescriptions,
  updateAppointmentStatus, searchMedicines, getAppointmentPrescription,
  getMedicineDetails, getPayment,
} from '../../api';
import api from '../../api';
import PrintPrescription from '../../components/PrintPrescription';
import PrintBill from '../../components/PrintBill';
import SmartPad from '../../components/SmartPad';

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
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
        >
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((m, idx) => (
              <button
                key={`${m.name}-${idx}`}
                type="button"
                className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                onMouseDown={() => selectMedicine(m)}
              >
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">{m.name}</div>
                  {m.generic_name && (
                    <div className="text-[10px] text-gray-400 truncate">{m.generic_name}</div>
                  )}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                  m.category === 'FDA Result'
                    ? 'bg-orange-50 text-orange-500'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {m.category === 'FDA Result' ? 'FDA' : 'Local'}
                </span>
              </button>
            ))}
          </div>
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-2 px-2 py-2">

        {/* Name — takes remaining space */}
        <div className="flex-1 min-w-0">{nameInput}</div>

        {/* Dosage */}
        <input
          className="input text-sm w-24 flex-shrink-0 text-center"
          placeholder="Dosage"
          value={item.dosage}
          disabled={disabled}
          onChange={(e) => onChange('dosage', e.target.value)}
        />

        {/* Timing M / A / N checkboxes */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            { key: 'morning',   short: 'M', color: 'accent-amber-500'   },
            { key: 'afternoon', short: 'A', color: 'accent-sky-500'      },
            { key: 'night',     short: 'N', color: 'accent-indigo-600'   },
          ].map(({ key, short, color }) => (
            <label
              key={key}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
              className={`flex flex-col items-center gap-0.5 ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
            >
              <span className="text-[10px] font-bold text-gray-400 leading-none">{short}</span>
              <input
                type="checkbox"
                checked={Boolean(item[key])}
                disabled={disabled}
                onChange={(e) => !disabled && onChange(key, e.target.checked)}
                className={`w-4 h-4 rounded ${color} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              />
            </label>
          ))}
        </div>

        {/* Days */}
        <div className="relative flex-shrink-0 w-14">
          <input
            type="number"
            min="1"
            className="input text-sm text-center pr-4 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="—"
            value={item.duration}
            disabled={disabled}
            onChange={(e) => onChange('duration', e.target.value)}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">d</span>
        </div>

        {/* Delete */}
        {!disabled && (
          <button type="button" onClick={onRemove} title="Remove"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryDetailModal({ rx, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Prescription Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">{rx.appointment?.date}</span>
          <span className="text-xs text-gray-500">{rx.doctor?.name}</span>
        </div>
        {rx.diagnosis && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Diagnosis</p>
            <p className="text-sm text-gray-800">{rx.diagnosis}</p>
          </div>
        )}
        {rx.items?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Medicines</p>
            <div className="space-y-2">
              {rx.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700 border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-gray-400 text-xs mt-0.5">{i + 1}.</span>
                  <div>
                    <span className="font-medium">{item.medicine_name}</span>
                    {item.dosage && <span className="text-gray-500"> — {item.dosage}</span>}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[item.morning && 'Morning', item.afternoon && 'Afternoon', item.night && 'Night'].filter(Boolean).join(' · ')}
                      {item.duration ? ` · ${item.duration} days` : ''}
                    </div>
                    {item.instructions && <div className="text-xs text-blue-600 mt-0.5">{item.instructions}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {rx.notes && (
          <div className="p-2 bg-yellow-50 rounded">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700">{rx.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientHistory({ patientId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    if (patientId) getPatientPrescriptions(patientId).then(({ data }) => setHistory(data));
  }, [patientId, refreshKey]);

  if (history.length === 0) return <div className="text-sm text-gray-400 text-center py-8">No previous visits</div>;

  return (
    <>
      {selectedRx && <HistoryDetailModal rx={selectedRx} onClose={() => setSelectedRx(null)} />}
      <div className="space-y-3 overflow-y-auto max-h-96">
        {history.map((rx) => (
          <div
            key={rx.id}
            onClick={() => setSelectedRx(rx)}
            className="border border-gray-100 rounded-lg p-3 bg-gray-50 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
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
                {rx.items.slice(0, 2).map((item, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    {i + 1}. {item.medicine_name} {item.dosage} —{' '}
                    {[item.morning && 'M', item.afternoon && 'A', item.night && 'N'].filter(Boolean).join('-')}
                    {item.duration ? ` — ${item.duration}d` : ''}
                  </div>
                ))}
                {rx.items.length > 2 && (
                  <div className="text-xs text-blue-500">+{rx.items.length - 2} more — click to view</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
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
  const [procedureCharge, setProcedureCharge] = useState('');
  const [procedureLabel, setProcedureLabel] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const procedureEnabled = localStorage.getItem('procedure_charge_enabled') === 'true';
  const [smartPadEnabled, setSmartPadEnabled] = useState(localStorage.getItem('smart_pad_enabled') !== 'false');
  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      const sp = data.smart_pad_enabled !== 0 && data.smart_pad_enabled !== false;
      setSmartPadEnabled(sp);
      localStorage.setItem('smart_pad_enabled', String(sp));
    }).catch(() => {});
  }, []);
  const printRef = useRef();
  const billRef = useRef();

  const handlePrint = useReactToPrint({ content: () => printRef.current });
  const handlePrintBill = useReactToPrint({ content: () => billRef.current });

  const isCompleted = appointment.status === 'completed';

  // Load existing prescription + payment when viewing a completed appointment
  useEffect(() => {
    if (!isCompleted) return;
    Promise.all([
      getAppointmentPrescription(appointment.id),
      getPayment(appointment.id).catch(() => ({ data: null })),
    ]).then(([{ data: rx }, { data: pmt }]) => {
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
      setProcedureCharge(rx.procedure_charge > 0 ? String(rx.procedure_charge) : '');
      setProcedureLabel(rx.procedure_label || '');
      setSavedRx({ ...rx, doctor, patient: appointment.patient, appointment });
      setPaymentData(pmt);
    });
  }, [appointment.id, isCompleted]);

  const handleAIExtract = (result) => {
    if (result.diagnosis) setDiagnosis(result.diagnosis);
    if (result.notes)     setNotes(result.notes);
    if (result.medicines?.length) {
      setItems(result.medicines.map((m) => ({
        medicine_name: m.medicine_name || '',
        dosage:        m.dosage        || '',
        morning:       Boolean(m.morning),
        afternoon:     Boolean(m.afternoon),
        night:         Boolean(m.night),
        duration:      m.duration != null ? String(m.duration) : '',
        instructions:  '',
      })));
    }
  };

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
        procedure_charge: procedureCharge ? Number(procedureCharge) : 0,
        procedure_label:  procedureLabel.trim() || null,
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
              <>
                <button onClick={handlePrint} className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">
                  <span className="hidden sm:inline">🖨 Print Rx</span>
                  <span className="sm:hidden">🖨</span>
                </button>
                <button onClick={handlePrintBill} className="text-xs sm:text-sm px-2 sm:px-4 btn-secondary bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100">
                  <span className="hidden sm:inline">🧾 Print Bill</span>
                  <span className="sm:hidden">🧾</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">Close</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x min-h-96">
          <div className="flex-1 p-4 sm:p-5 space-y-4">

            {/* ── AI Smart Write Pad ── */}
            <SmartPad
              mode="consultation"
              disabled={!!savedRx || !smartPadEnabled}
              onExtract={handleAIExtract}
            />

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
              <div className="flex items-center gap-2 mb-2 px-2">
                <label className="label mb-0 flex-shrink-0">Medicines</label>
                <div className="flex-1" />
                <span className="hidden sm:block text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-24 text-center">Dosage</span>
                <span className="hidden sm:block text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-[88px] text-center">M · A · N</span>
                <span className="hidden sm:block text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 text-center">Days</span>
                <span className="w-7" />
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
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Medicine
                </button>
              )}
            </div>

            {/* Procedure Charge — only shown when enabled in Admin Settings */}
            {procedureEnabled && (
              <div className={`rounded-xl border p-3 space-y-2 ${savedRx && !procedureCharge ? 'hidden' : ''} ${savedRx ? 'bg-orange-50 border-orange-200' : 'bg-orange-50/60 border-orange-200'}`}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Procedure Charge</span>
                  <span className="text-xs text-gray-400">(optional)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="e.g. Injection, IV Drip, Inhaler, Dressing"
                    value={procedureLabel}
                    disabled={!!savedRx}
                    onChange={(e) => setProcedureLabel(e.target.value)}
                  />
                  <div className="relative w-28 flex-shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">₹</span>
                    <input
                      type="number"
                      min="0"
                      className="input pl-7 text-sm font-bold text-orange-700 w-full"
                      placeholder="0"
                      value={procedureCharge}
                      disabled={!!savedRx}
                      onChange={(e) => setProcedureCharge(e.target.value)}
                    />
                  </div>
                </div>
                {savedRx && procedureCharge && (
                  <div className="text-xs text-orange-600 font-medium">
                    {procedureLabel || 'Procedure'} — ₹{Number(procedureCharge).toLocaleString('en-IN')} (to be collected at billing)
                  </div>
                )}
              </div>
            )}

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
          <PrintBill
            ref={billRef}
            bill={{
              doctor,
              patient: appointment.patient,
              appointment,
              consultationFee: paymentData?.amount ?? doctor?.consultation_fee ?? 0,
              procedureCharge: savedRx.procedure_charge,
              procedureLabel: savedRx.procedure_label,
              paymentStatus: paymentData ? 'paid' : appointment.payment_status,
              hospitalName: localStorage.getItem('hospital_name') || 'Hospital Management System',
            }}
          />
        </div>
      )}
    </div>
  );
}
