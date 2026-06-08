import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchPatients, createPatient, getDoctors, getAvailableSlots, createAppointment, createReceptionCharge, getPendingProcedureCharges, payProcedureCharge } from '../../api';
import PaymentStep from './PaymentStep';
import ReceiptView from './ReceiptView';
import { useToast } from '../../components/Toast';
import SmartPad from '../../components/SmartPad';

const STEPS = { SEARCH: 'search', REGISTER: 'register', BOOK: 'book', PAYMENT: 'payment', RECEIPT: 'receipt' };

// ── Client-side field extraction from raw OCR text ────────────────────────────
function parseOcrText(raw) {
  // Normalise: collapse multiple spaces, trim lines
  const text = raw.replace(/\r/g, '').replace(/[ \t]{2,}/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── 1. Card type ───────────────────────────────────────────────────────────
  let idType = 'aadhaar';
  if (/income\s*tax|permanent\s*account|\bpan\b/i.test(text)) idType = 'pan';
  else if (/election\s*commission|voter|elector|epic/i.test(text)) idType = 'voter';
  else if (/driving\s*licen|transport\s*dep|\bdl\s*no/i.test(text)) idType = 'dl';

  // ── 2. ID Number ───────────────────────────────────────────────────────────
  let idNumber = '';
  if (idType === 'voter' || idType === 'dl') {
    // EPIC voter ID: 3 letters + 7 digits (e.g. TRQ0837427, XMK1434562, GDN0225185)
    const epicM = text.match(/\b([A-Z]{3}\d{7})\b/i);
    if (epicM) idNumber = epicM[1].toUpperCase();
    // DL format: 2 letters + 13 digits, skip for now — fall through to Aadhaar check
  }
  if (!idNumber) {
    // FIX Bug5: strip VID lines so 16-digit VID can't pre-empt the 12-digit Aadhaar number
    const textNoVid = text.replace(/\bVID\s*[:\s]+[\d\s]{10,25}/gi, '');
    const aaSpaced = textNoVid.match(/\b(\d{4} \d{4} \d{4})\b/);
    if (aaSpaced) {
      idNumber = aaSpaced[1];
      if (idType !== 'voter') idType = 'aadhaar';
    } else {
      const aaAny = textNoVid.match(/\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/);
      if (aaAny) {
        const d = aaAny[1].replace(/\D/g, '');
        if (d.length === 12) { idNumber = `${d.slice(0,4)} ${d.slice(4,8)} ${d.slice(8)}`; if (idType !== 'voter') idType = 'aadhaar'; }
      }
    }
  }
  if (!idNumber && idType === 'pan') {
    const panM = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/i);
    if (panM) idNumber = panM[1].toUpperCase();
  }

  // ── 3. DOB → Age ──────────────────────────────────────────────────────────
  let age = '';
  // Patterns ordered: labeled first (most reliable), then bare date
  const dobPatterns = [
    // "DOB: 24/05/2004" or "DOB 24-05-2004"
    /(?:dob|d\.o\.b\.?)\s*[:\s]+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i,
    // "Date of Birth : 25/05/1998" or "DATE OF BIRTH/AGE : 15/02/1985"
    /date\s*of\s*birth(?:\s*\/\s*age)?\s*[:\s]+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i,
    // "பிறந்த நாள்/DOB: 24/05/2004" (Tamil label)
    /(?:பிறந்த|जन्म|জন্ম|ಜನ್ಮ)\s*[^\n]{0,30}?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    // Bare DD/MM/YYYY (last resort)
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/,
  ];
  for (const pat of dobPatterns) {
    const m = text.match(pat);
    if (!m) continue;
    const dd = +m[1], mm = +m[2], yy = +m[3];
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 1900 && yy <= new Date().getFullYear()) {
      const now = new Date();
      const turned = now.getMonth() + 1 > mm || (now.getMonth() + 1 === mm && now.getDate() >= dd);
      age = String(now.getFullYear() - yy - (turned ? 0 : 1));
      break;
    }
  }

  // ── 4. Gender ─────────────────────────────────────────────────────────────
  let gender = '';
  // "Sex : M" / "Sex : F" / "Sex : Male" / "Sex : Female"
  // "ling / Sex : Female" / "लिंग / Sex : पुरुष/ Male" / "ஆண்பால் / Male"
  const sexLabel = text.match(
    /(?:sex|gender|लिंग|ling|ஆண்பால்|பெண்பால்|লিঙ্গ|ಲಿಂಗ)\s*[\/\s]*(?:[^\n:]{0,20}?)\s*[:\s]\s*(male|female|m|f|पुरुष|महिला|ஆண்|பெண்|M\/Male|F\/Female)/i
  );
  if (sexLabel) {
    const v = sexLabel[1].toLowerCase();
    gender = (v.startsWith('f') || v === 'महिला' || v === 'பெண்') ? 'Female' : 'Male';
  }
  if (!gender) {
    // Single letter after "Sex :" or "Sex/M"
    const mfShort = text.match(/\bsex\b\s*[:/]\s*([MF])\b/i);
    if (mfShort) gender = mfShort[1].toUpperCase() === 'F' ? 'Female' : 'Male';
  }
  if (!gender) {
    // FIX Bug4: colon-free Tamil label "ஆண்பால் / Male" has no colon between label and value
    const tamilSex = text.match(/(?:ஆண்பால்|பெண்பால்)\s*[\/\s]+\s*(male|female)/i);
    if (tamilSex) gender = tamilSex[1].toLowerCase() === 'female' ? 'Female' : 'Male';
  }
  if (!gender) {
    if (/\bfemale\b/i.test(text) || /महिला/.test(text) || /பெண்/.test(text) || /ಮಹಿಳೆ/.test(text)) gender = 'Female';
    else if (/\bmale\b/i.test(text) || /पुरुष/.test(text) || /ஆண்/.test(text) || /ಪುರుಷ/.test(text)) gender = 'Male';
  }

  // ── 5. Name ───────────────────────────────────────────────────────────────
  let name = '';
  // Try labeled extraction first — handles voter IDs and Aadhaar letters
  // FIX Bug1: use literal space [ ] not \s so patterns never cross newlines
  const nameLabelPats = [
    /elector['s]*\s*name\s*[:\s]+([A-Z][A-Z .'\\-]{1,50})/i,
    /original\s*name\s*[:\s]+([A-Z][A-Z .'\\-]{1,50})/i,
    /(?:निर्वाचक\s*का\s*नाम|नाम)\s*[:\s]+([A-Z][A-Z .'\\-]{1,50})/i,
    /(?:^|\n)\s*(?:name|நாம|ಹೆಸರು|नाम)\s*[:\s]+([A-Za-z][A-Za-z .'\\-]{1,50})/im,
  ];
  for (const pat of nameLabelPats) {
    const m = text.match(pat);
    if (m) { name = m[1].trim().split(/\s+/).join(' '); break; }
  }
  if (!name) {
    // Heuristic: first clean English alpha line, skipping card headers & numbers
    const HEADER = /^(government|india|unique|aadhaar|address|male|female|dob|date|year|of|birth|help|www|enrol|vid|income|tax|permanent|account|election|commission|driving|voter|uidai|authority|elector|father|relation|epic|identity|card|republic|utility|valid|bearer|pay|rupee|bank|ifsc|a\/c|account|savings|cheque)/i;
    for (const line of lines) {
      if (HEADER.test(line) || /\d{4,}/.test(line) || line.length < 3) continue;
      if (/^[SWD][/\\][OoHh]/i.test(line)) continue; // Bug3: skip address relation lines
      const cleaned = line.replace(/[^A-Za-z\s.\-']/g, '').trim();
      // Must be mostly letters, length 3-60
      if (cleaned.length >= 3 && cleaned.length <= 60 && /[A-Za-z]{2}/.test(cleaned)) {
        name = cleaned;
        break;
      }
    }
  }

  // ── 6. Address ────────────────────────────────────────────────────────────
  let address = '';
  const _buildAddr = (raw) => {
    // Bug2: include PIN code — don't strip at \d{6} boundary
    const pinM2 = text.match(/\b(\d{6})\b/);
    let body = raw.replace(/\n/g, ', ').replace(/,\s*,/g, ',').trim();
    if (pinM2 && !body.includes(pinM2[1])) body = body + ', ' + pinM2[1];
    return body.slice(0, 300);
  };
  // Labeled "Address :" block (Aadhaar letter, some voter IDs)
  const addrLabel = text.match(/(?:^|\n)\s*address\s*[:\s]+(.+?)(?=\n{2}|$)/is);
  if (addrLabel) address = _buildAddr(addrLabel[1]);
  if (!address) {
    // "S/O Karuppiah, 55-4..." or "W/O..." or "D/O..."
    const soM = text.match(/[SWD][/\\][OoHh]\.?\s+(.+?)(?=\n{2}|$)/is);
    if (soM) address = _buildAddr(soM[1]);
  }
  if (!address) {
    // Use PIN code as anchor — collect text before it
    const pinM = text.match(/\b(\d{6})\b/);
    if (pinM) {
      const idx = text.indexOf(pinM[0]);
      const snippet = text.slice(Math.max(0, idx - 200), idx + 7);
      address = snippet.replace(/\n/g, ', ').replace(/,\s*,/g, ',').trim().slice(0, 300);
    }
  }

  return { name, age, gender, address, id_number: idNumber, id_type: idType };
}

const STEP_LABELS = [
  { keys: ['search', 'register'], label: 'Patient' },
  { keys: ['book'],               label: 'Appointment' },
  { keys: ['payment'],            label: 'Payment' },
  { keys: ['receipt'],            label: 'Done' },
];

function StepBar({ step }) {
  const activeIdx = STEP_LABELS.findIndex(s => s.keys.includes(step));
  return (
    <div className="flex items-start gap-0 mb-1">
      {STEP_LABELS.map((s, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done   ? 'bg-green-500 border-green-500 text-white'
                : active ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-semibold truncate ${
                active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 flex-[2] mx-1 mt-3.5 transition-all rounded-full ${
                i < activeIdx ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PatientCard({ patient, onSelect }) {
  return (
    <div
      className="card flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:border-blue-300 border border-transparent transition-all hover:translate-y-[-2px] active:scale-[0.98] gap-4"
      onClick={() => onSelect(patient)}
    >
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 text-blue-700 rounded-2xl w-12 h-12 flex items-center justify-center font-bold text-lg flex-shrink-0">
          {patient.name[0]}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-gray-900 text-base sm:text-lg truncate">{patient.name}</div>
          <div className="text-xs sm:text-sm text-gray-500 truncate">
            <span className="font-medium text-gray-700">{patient.patient_id}</span> &bull; {patient.phone} &bull; {patient.gender}
          </div>
        </div>
      </div>
      <button className="btn-primary w-full sm:w-auto text-sm">Book Appointment</button>
    </div>
  );
}


function RegisterForm({ phone, onRegistered }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', phone: phone || '', address: '', id_number: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [ocrState, setOcrState] = useState('idle'); // idle | scanning | done
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrCardType, setOcrCardType] = useState('');
  const [preview, setPreview] = useState(null);
  // Track which fields were filled by OCR so we can clear them on cancel
  const ocrFilledRef = useRef({ name: false, age: false, gender: false, address: false, id_number: false });
  const uploadRef = useRef();
  const cameraRef = useRef();
  const workerRef = useRef(null);

  const clearOcrFields = () => {
    const filled = ocrFilledRef.current;
    setForm((prev) => ({
      ...prev,
      name:    filled.name    ? '' : prev.name,
      age:     filled.age     ? '' : prev.age,
      gender:  filled.gender  ? 'Male' : prev.gender,
      address:   filled.address   ? '' : prev.address,
      id_number: filled.id_number ? '' : prev.id_number,
    }));
    ocrFilledRef.current = { name: false, age: false, gender: false, address: false, id_number: false };
    setOcrCardType('');
  };

  const cancelOcr = () => {
    clearOcrFields();
    setOcrState('idle');
    setOcrProgress(0);
    setPreview(null);
    if (uploadRef.current) uploadRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const fillFromExtracted = (extracted) => {
    ocrFilledRef.current = {
      name:      !!extracted.name,
      age:       !!extracted.age,
      gender:    !!extracted.gender,
      address:   !!extracted.address,
      id_number: !!extracted.id_number,
    };
    setForm((prev) => ({
      ...prev,
      name:      extracted.name      || prev.name,
      age:       extracted.age       || prev.age,
      gender:    extracted.gender    || prev.gender,
      address:   extracted.address   || prev.address,
      id_number: extracted.id_number || prev.id_number,
    }));
    setOcrCardType((extracted.id_type || 'ID Card').toUpperCase());
    setOcrState('done');
    setOcrProgress(100);
  };

  const runOcr = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setOcrState('scanning');
    setOcrProgress(10);

    // 1. Claude AI extraction (high accuracy)
    try {
      const formData = new FormData();
      formData.append('file', file);
      setOcrProgress(30);
      const response = await fetch('/api/ocr/extract-ai', { method: 'POST', body: formData });
      const json = await response.json();
      if (response.ok && json.success && json.data) {
        fillFromExtracted(json.data);
        return;
      }
    } catch {
      // network error — fall through to client-side
    }

    // 2. Client-side OCR with Tesseract.js (fallback)
    try {
      setOcrProgress(40);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(40 + Math.round(m.progress * 50));
          }
        },
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setOcrProgress(95);
      const extracted = parseOcrText(text);
      fillFromExtracted(extracted);
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrCardType('Manual entry required');
      setOcrState('done');
      setOcrProgress(100);
    }
  };

  const handleSmartPadExtract = (result) => {
    setForm((prev) => ({
      ...prev,
      name:    result.name    || prev.name,
      phone:   result.phone   || prev.phone,
      age:     result.age     || prev.age,
      gender:  result.gender  || prev.gender,
      address: result.address || prev.address,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await createPatient(form);
      setRegistered(true);
      toast.success(`Patient "${data.name}" registered successfully!`);
      setTimeout(() => { setRegistered(false); onRegistered(data); }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 w-full max-w-lg">
      <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3 xs:gap-4">
        <h2 className="font-bold text-lg text-gray-800">New Patient Registration</h2>
        <div className="flex flex-col gap-2 items-end">
          {/* Upload button */}
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => runOcr(e.target.files[0])}
          />
          {/* Camera capture button */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => runOcr(e.target.files[0])}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => uploadRef.current.click()}
              disabled={ocrState === 'scanning'}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload & Extract
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current.click()}
              disabled={ocrState === 'scanning'}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Capture & Extract
            </button>
          </div>
          {ocrState === 'done' && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md border border-green-200">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[11px] font-semibold text-green-700 leading-none">
                {ocrCardType === 'Manual entry required' ? 'Review required' : `${ocrCardType} Detected`}
              </span>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={preview} alt="ID preview" className="w-full max-h-36 object-contain" />

          {/* Scanning overlay */}
          {ocrState === 'scanning' && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 rounded-lg">
              {/* Spinner */}
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {/* Progress bar */}
              <div className="w-40 bg-white/30 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
              <span className="text-white text-xs font-medium">Scanning... {ocrProgress}%</span>
              {/* Cancel button */}
              <button
                type="button"
                onClick={cancelOcr}
                className="mt-1 px-3 py-1 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
              >
                Cancel
              </button>
            </div>
          )}

          {/* X button when not scanning — clears image AND OCR-filled fields */}
          {ocrState !== 'scanning' && (
            <button
              type="button"
              onClick={() => {
                clearOcrFields();
                setPreview(null);
                setOcrState('idle');
                setOcrProgress(0);
                if (uploadRef.current) uploadRef.current.value = '';
                if (cameraRef.current) cameraRef.current.value = '';
              }}
              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Remove ID scan and clear auto-filled fields"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

      {/* ── AI Smart Write Pad ── */}
      <SmartPad
        mode="patient"
        onExtract={handleSmartPadExtract}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Full Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Age</label>
          <input type="number" className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="label">Phone *</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div>
          <label className="label">ID Number (Aadhaar/PAN)</label>
          <input className="input font-mono" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="XXXX XXXX XXXX" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <textarea className="input resize-none" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </div>
      <button type="submit" className={`btn-primary w-full flex items-center justify-center gap-2 transition-all ${registered ? 'bg-green-600' : ''}`} disabled={loading || registered}>
        {loading ? 'Registering...' : registered ? '✓ Registered' : 'Register Patient'}
      </button>
    </form>
  );
}

function BookAppointment({ patient, onBooked }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  const [substitute, setSubstitute] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    getDoctors().then(({ data }) => setDoctors(data));
  }, []);

  React.useEffect(() => {
    if (selectedDoctor && date) {
      setLoadingSlots(true);
      setSelectedSlot('');
      setUnavailable(false);
      setSubstitute(null);
      getAvailableSlots(selectedDoctor.id, date)
        .then(({ data }) => {
          setSlots(data.slots || []);
          setUnavailable(!!data.unavailable);
          setSubstitute(data.substitute || null);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctor, date]);

  const switchToSubstitute = () => {
    const sub = doctors.find((d) => d.id === substitute?.id);
    if (sub) { setSelectedDoctor(sub); setSubstitute(null); }
  };

  const book = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await createAppointment({
        patient_id: patient.id,
        doctor_id: selectedDoctor.id,
        date,
        time_slot: selectedSlot,
      });
      setBooked(true);
      setTimeout(() => {
        setBooked(false);
        onBooked(data, selectedDoctor);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-2xl space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold">
          {patient.name[0]}
        </div>
        <div>
          <div className="font-semibold">{patient.name}</div>
          <div className="text-sm text-gray-500">{patient.patient_id} &bull; {patient.phone}</div>
        </div>
      </div>

      <h2 className="font-bold text-lg">Book Appointment</h2>
      {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

      <div>
        <label className="label">Select Doctor</label>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
          {doctors.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDoctor(d)}
              className={`text-left p-3 rounded-lg border transition ${
                selectedDoctor?.id === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{d.name}</div>
              <div className="text-xs text-gray-500">{d.specialization}</div>
              <div className="text-xs font-bold text-green-600 mt-1">
                ₹{Number(d.consultation_fee || 0).toLocaleString('en-IN')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Date</label>
        <input
          type="date"
          className="input max-w-xs"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {selectedDoctor && (
        <div>
          <label className="label">Time Slot</label>
          {loadingSlots ? (
            <div className="text-sm text-gray-500">Loading slots...</div>
          ) : unavailable ? (
            substitute ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-amber-900 text-sm">
                      {selectedDoctor.name} is on leave on this date
                    </div>
                    <div className="text-amber-700 text-sm mt-0.5">
                      Covered by:&nbsp;
                      <span className="font-bold text-amber-900">{substitute.name}</span>
                      <span className="text-amber-600 ml-1">· {substitute.specialization}</span>
                    </div>
                    {substitute.consultation_fee > 0 && (
                      <div className="text-xs text-amber-600 mt-0.5">
                        Fee: ₹{Number(substitute.consultation_fee).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={switchToSubstitute}
                  className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Book with Dr. {substitute.name} instead
                </button>
              </div>
            ) : (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                {selectedDoctor.name} is on leave on this date. Please choose another date or doctor.
              </div>
            )
          ) : slots.length === 0 ? (
            <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">No slots available for this date</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {slots.map(({ time, available }) => (
                <button
                  key={time}
                  disabled={!available || booked}
                  onClick={() => setSelectedSlot(time)}
                  className={`py-2 text-sm rounded-lg border transition ${
                    !available
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                      : selectedSlot === time
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedDoctor && selectedSlot && (
        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-800">{selectedDoctor.name}</div>
            <div className="text-xs text-slate-500">{selectedSlot} · {selectedDoctor.specialization}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Consultation Fee</div>
            <div className="text-xl font-black text-green-600">
              ₹{Number(selectedDoctor.consultation_fee || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      <button
        className={`btn-primary w-full flex items-center justify-center gap-2 transition-all ${booked ? 'bg-green-600' : ''}`}
        disabled={!selectedDoctor || !selectedSlot || loading || booked}
        onClick={book}
      >
        {loading ? 'Booking...' : booked ? '✓ Appointment Booked'
          : selectedDoctor && selectedSlot
            ? `Confirm & Pay ₹${Number(selectedDoctor.consultation_fee || 0).toLocaleString('en-IN')}`
            : 'Confirm Appointment'}
      </button>
    </div>
  );
}

function TokenConfirmation({ appointment, onNewBooking }) {
  return (
    <div className="card max-w-md mx-auto text-center space-y-6">
      <div className="text-green-600 text-5xl">✓</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Appointment Confirmed!</h2>
        <p className="text-gray-500 text-sm mt-1">{appointment.patient?.name}</p>
      </div>
      <div className="bg-blue-50 rounded-xl p-6">
        <div className="text-sm text-gray-500 uppercase tracking-wide">Token Number</div>
        <div className="text-5xl font-bold text-blue-700 my-2">{appointment.token_display}</div>
        <div className="text-sm text-gray-600">Queue Position: #{appointment.queue_position}</div>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <div><span className="font-medium">Doctor:</span> {appointment.doctor?.name}</div>
        <div><span className="font-medium">Date:</span> {appointment.date}</div>
        <div><span className="font-medium">Time:</span> {appointment.time_slot}</div>
      </div>
      <button className="btn-primary w-full" onClick={onNewBooking}>New Appointment</button>
    </div>
  );
}

const PROC_LABELS = ['Blood Test', 'ECG', 'X-Ray', 'Ultrasound', 'Dressing', 'Injection', 'IV Drip', 'Nebulization', 'Physiotherapy', 'Other'];
const MODES_POS = [
  { key: 'cash', label: 'Cash', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'upi',  label: 'UPI',  color: 'border-violet-400 bg-violet-50 text-violet-700'  },
  { key: 'card', label: 'Card', color: 'border-cyan-400 bg-cyan-50 text-cyan-700'    },
];

function printProcedureReceipt(charge) {
  const hospitalName = localStorage.getItem('hospital_name') || 'Hospital Clinic';
  const tagline = localStorage.getItem('hospital_tagline') || 'Your Health, Our Priority';
  const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>${charge.charge_no}</title>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#222;padding:20px;margin:0}
  .box{max-width:380px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;padding:22px}
  .hdr{text-align:center;border-bottom:2px solid #ea580c;padding-bottom:12px;margin-bottom:16px}
  .hname{font-size:19px;font-weight:900;color:#7c2d12;letter-spacing:.5px}
  .htag{font-size:11px;color:#6b7280;margin-top:3px}
  .badge{display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;margin:12px auto;display:block;width:fit-content}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  td{padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
  td:last-child{font-weight:600;text-align:right}
  .lbl{color:#6b7280}
  .total-row td{font-size:16px;font-weight:900;border-top:2px solid #ea580c;border-bottom:none;padding-top:11px;color:#c2410c}
  .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:12px}
  .print-btn{display:block;width:100%;margin:18px 0 4px;padding:11px;background:#ea580c;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:8px;cursor:pointer}
  .print-btn:hover{background:#c2410c}
  @media print{.print-btn{display:none!important}body{padding:0}.box{border:none;border-radius:0}}
</style></head><body>
<div class="box">
  <div class="hdr">
    <div class="hname">${hospitalName}</div>
    ${tagline ? `<div class="htag">${tagline}</div>` : ''}
    <div class="htag" style="margin-top:6px;font-weight:700;color:#374151">Procedure Charge Receipt</div>
  </div>
  <div class="badge">🧾 ${charge.charge_no}</div>
  <table>
    <tr><td class="lbl">Patient</td><td>${charge.patient_name}${charge.patient_code ? ` (${charge.patient_code})` : ''}</td></tr>
    <tr><td class="lbl">Procedure</td><td>${charge.label}</td></tr>
    <tr><td class="lbl">Payment Mode</td><td>${MODE_LABEL[charge.payment_mode] || charge.payment_mode}</td></tr>
    ${charge.transaction_ref ? `<tr><td class="lbl">Ref</td><td>${charge.transaction_ref}</td></tr>` : ''}
    <tr><td class="lbl">Date & Time</td><td>${new Date(charge.created_at).toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Amount Collected</td><td>₹${Number(charge.amount).toLocaleString('en-IN')}</td></tr>
  </table>
  <div class="footer">Thank you · Please retain this receipt for your records.</div>
  <button class="print-btn" onclick="window.print()">🖨 Print</button>
</div>
</body></html>`;
  const w = window.open('', '_blank', 'width=440,height=580');
  w.document.write(html);
  w.document.close();
  w.focus();
}

function ProcedureChargePanel() {
  const empty = { patient_name: '', patient_code: '', label: '', custom_label: '', amount: '', mode: 'cash', txRef: '' };
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const collect = async () => {
    const label = form.label === 'Other' ? form.custom_label.trim() : form.label;
    if (!form.patient_name.trim()) { setError('Patient name is required.'); return; }
    if (!label) { setError('Select or enter a procedure name.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await createReceptionCharge({
        patient_name: form.patient_name.trim(),
        patient_code: form.patient_code.trim() || undefined,
        label,
        amount: Number(form.amount),
        payment_mode: form.mode,
        transaction_ref: form.txRef.trim() || undefined,
      });
      setDone(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to collect charge.');
    }
    setLoading(false);
  };

  const reset = () => { setForm(empty); setDone(null); setError(''); };

  if (done) {
    return (
      <div className="card border-orange-200 bg-orange-50/40 space-y-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-800 text-sm">Charge Collected</div>
            <div className="text-xs text-gray-500 font-mono">{done.charge_no}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-black text-orange-600">₹{Number(done.amount).toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-400">{done.label}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-medium">{done.patient_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Mode</span><span className="font-medium capitalize">{done.payment_mode}</span></div>
          {done.transaction_ref && <div className="flex justify-between"><span className="text-gray-500">Ref</span><span className="font-medium">{done.transaction_ref}</span></div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => printProcedureReceipt(done)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl border border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print Receipt
          </button>
          <button onClick={reset} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all">
            New Charge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-orange-200 space-y-3 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1 border-b border-orange-100">
        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">Collect Procedure Charge</div>
          <div className="text-[10px] text-gray-400">Blood test, ECG, dressing, injection…</div>
        </div>
      </div>

      {/* Patient Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Name <span className="text-red-400">*</span></label>
        <input
          className="input text-sm py-2"
          placeholder="e.g. Ravi Kumar"
          value={form.patient_name}
          onChange={e => set('patient_name', e.target.value)}
        />
      </div>

      {/* Patient ID (optional) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          className="input text-sm py-2"
          placeholder="e.g. PAT000123"
          value={form.patient_code}
          onChange={e => set('patient_code', e.target.value)}
        />
      </div>

      {/* Procedure label */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Procedure / Reason <span className="text-red-400">*</span></label>
        <select className="input text-sm py-2" value={form.label} onChange={e => set('label', e.target.value)}>
          <option value="">— Select —</option>
          {PROC_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        {form.label === 'Other' && (
          <input
            className="input text-sm py-2 mt-1.5 animate-fade-up"
            placeholder="Enter procedure name"
            value={form.custom_label}
            onChange={e => set('custom_label', e.target.value)}
          />
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
        <input
          className="input text-sm py-2 font-bold"
          type="number"
          min="1"
          placeholder="0"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
        />
      </div>

      {/* Payment Mode */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Mode</label>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES_POS.map(m => (
            <button
              key={m.key}
              onClick={() => { set('mode', m.key); set('txRef', ''); }}
              className={`py-2 text-xs font-bold rounded-lg border-2 transition-all ${form.mode === m.key ? m.color : 'border-gray-200 bg-gray-50 text-gray-500'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {(form.mode === 'upi' || form.mode === 'card') && (
          <input
            className="input text-sm py-2 mt-1.5 animate-fade-up"
            placeholder={form.mode === 'upi' ? 'UPI Transaction ID (optional)' : 'Card Last 4 Digits (optional)'}
            value={form.txRef}
            maxLength={form.mode === 'card' ? 4 : 30}
            onChange={e => set('txRef', e.target.value)}
          />
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Collect button */}
      <button
        onClick={collect}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-orange-900/10 flex items-center justify-center gap-2"
      >
        {loading ? 'Processing…' : (
          <>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Collect ₹{form.amount ? Number(form.amount).toLocaleString('en-IN') : '0'}
          </>
        )}
      </button>
    </div>
  );
}

/* ── Procedure Charge Bill print helper ─────────────────────────────────────── */
function printProcBill(rx) {
  const hospitalName = localStorage.getItem('hospital_name') || 'Hospital Clinic';
  const tagline = localStorage.getItem('hospital_tagline') || '';
  const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };
  const consultAmt = Number(rx.consult_amount || 0);
  const procAmt = Number(rx.procedure_charge);
  const total = consultAmt + procAmt;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>${rx.procedure_receipt_no || 'Procedure Bill'}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#222;padding:24px}
  .box{max-width:400px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;padding:24px}
  .hdr{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:14px;margin-bottom:18px}
  .hname{font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
  .htag{font-size:11px;color:#6b7280;margin-top:3px}
  .doc-row{display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-bottom:14px}
  .patient-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:12px;margin-bottom:16px;display:flex;gap:20px;flex-wrap:wrap}
  .patient-box span{color:#6b7280}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#1d4ed8;color:#fff}
  thead th{padding:8px 12px;font-size:12px;font-weight:700;text-align:left}
  thead th:last-child{text-align:right}
  tbody tr{border-bottom:1px solid #f3f4f6}
  td{padding:9px 12px;font-size:13px}
  td.amt{text-align:right;font-weight:600}
  tfoot tr{background:#1d4ed8;color:#fff}
  tfoot td{padding:10px 12px;font-weight:900;font-size:15px}
  tfoot td:last-child{text-align:right}
  .mode-row{display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px}
  .paid-badge{text-align:center;margin-top:12px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-weight:700;font-size:13px;padding:8px;border-radius:8px}
  .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px}
  .print-btn{display:block;width:100%;margin:18px 0 4px;padding:11px;background:#1d4ed8;color:#fff;font-size:15px;font-weight:700;border:none;border-radius:8px;cursor:pointer}
  .print-btn:hover{background:#1e40af}
  @media print{.print-btn{display:none!important}body{padding:0}.box{border:none;border-radius:0}}
</style></head><body>
<div class="box">
  <div class="hdr">
    <div class="hname">${hospitalName}</div>
    ${tagline ? `<div class="htag">${tagline}</div>` : ''}
    <div class="htag" style="margin-top:6px;font-weight:600;color:#374151">Patient Bill / Receipt</div>
  </div>
  <div class="doc-row">
    <div><strong>${rx.doctor_name}</strong><br/><span style="color:#6b7280;font-size:11px">${rx.specialization || ''}</span></div>
    <div style="text-align:right;font-size:12px">
      Date: ${rx.appt_date || ''}<br/>
      Token: ${rx.token_display || ''}<br/>
      Time: ${rx.time_slot || ''}
    </div>
  </div>
  <div class="patient-box">
    <div><span>Patient: </span><strong>${rx.patient_name}</strong></div>
    <div><span>ID: </span><strong>${rx.patient_code || '—'}</strong></div>
    ${rx.gender ? `<div><span>Gender: </span><strong>${rx.gender}</strong></div>` : ''}
    ${rx.age ? `<div><span>Age: </span><strong>${rx.age} yrs</strong></div>` : ''}
  </div>
  <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#374151;margin-bottom:8px">BILL DETAILS</div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      ${consultAmt > 0 ? `<tr><td>1</td><td>Consultation Fee</td><td class="amt">₹${consultAmt.toLocaleString('en-IN')}</td></tr>` : ''}
      <tr><td>${consultAmt > 0 ? 2 : 1}</td><td style="color:#c2410c">${rx.procedure_label || 'Procedure Charge'}</td><td class="amt" style="color:#c2410c">₹${procAmt.toLocaleString('en-IN')}</td></tr>
    </tbody>
    <tfoot><tr><td colspan="2">TOTAL</td><td>₹${total.toLocaleString('en-IN')}</td></tr></tfoot>
  </table>
  <div class="mode-row"><span>Procedure Payment Mode</span><strong>${MODE_LABEL[rx.procedure_payment_mode] || rx.procedure_payment_mode || ''}</strong></div>
  ${rx.transaction_ref ? `<div class="mode-row" style="margin-top:6px"><span>Ref</span><strong>${rx.transaction_ref}</strong></div>` : ''}
  <div class="paid-badge">✓ PAYMENT RECEIVED</div>
  <div class="footer">Receipt: ${rx.procedure_receipt_no || ''} · This is a digitally generated bill.</div>
  <button class="print-btn" onclick="window.print()">🖨 Print</button>
</div>
</body></html>`;
  const w = window.open('', '_blank', 'width=460,height=680');
  w.document.write(html);
  w.document.close();
  w.focus();
}

/* ── Pay Procedure Modal ───────────────────────────────────────────────────── */
function PayProcedureModal({ item, onClose, onPaid }) {
  const [mode, setMode] = useState('cash');
  const [txRef, setTxRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const collect = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await payProcedureCharge(item.id, {
        payment_mode: mode,
        transaction_ref: txRef.trim() || undefined,
      });
      const result = { ...data, procedure_payment_mode: mode, transaction_ref: txRef.trim() || null };
      setDone(result);
      onPaid();
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed.');
    }
    setLoading(false);
  };

  const MODES = [
    { key: 'cash', label: 'Cash', sel: 'border-emerald-400 bg-emerald-50 text-emerald-700', idle: 'border-gray-200 bg-gray-50 text-gray-500' },
    { key: 'upi',  label: 'UPI',  sel: 'border-violet-400 bg-violet-50 text-violet-700',   idle: 'border-gray-200 bg-gray-50 text-gray-500' },
    { key: 'card', label: 'Card', sel: 'border-cyan-400 bg-cyan-50 text-cyan-700',          idle: 'border-gray-200 bg-gray-50 text-gray-500' },
  ];

  const consultAmt = Number(item.consult_amount || 0);
  const procAmt = Number(item.procedure_charge);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-base">Procedure Charge Payment</div>
            <div className="text-orange-100 text-xs mt-0.5">{item.token_display} · {item.patient_name}</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            /* ── SUCCESS STATE ── */
            <div className="space-y-4">
              <div className="text-center py-3">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 text-lg">Payment Complete!</div>
                <div className="text-sm text-gray-500 mt-1 font-mono">{done.procedure_receipt_no}</div>
              </div>
              <div className="bg-gray-50 rounded-xl border p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-medium">{done.patient_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Token</span><span className="font-mono font-bold text-blue-700">{done.token_display}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Procedure</span><span className="font-medium text-orange-700">{done.procedure_label}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mode</span><span className="font-medium capitalize">{done.procedure_payment_mode}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Amount Paid</span><span className="text-green-600">₹{procAmt.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => printProcBill(done)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  Print Bill
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* ── PAYMENT FORM ── */
            <>
              {/* Bill summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-1">Bill Summary</div>
                {consultAmt > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Consultation Fee</span>
                    <span className="flex items-center gap-1.5 text-green-700 font-medium">
                      <span className="text-[10px] bg-green-100 px-1.5 py-0.5 rounded-full font-bold">✓ Paid</span>
                      ₹{consultAmt.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">{item.procedure_label || 'Procedure Charge'}</span>
                  <span className="flex items-center gap-1.5 text-orange-700 font-bold">
                    <span className="text-[10px] bg-orange-100 px-1.5 py-0.5 rounded-full font-bold">⏳ Due</span>
                    ₹{procAmt.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-orange-200 pt-2 flex justify-between font-black text-base">
                  <span>Amount Due</span>
                  <span className="text-orange-600">₹{procAmt.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Doctor + patient info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  {item.patient_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{item.patient_name}</div>
                  <div className="text-xs text-gray-500">{item.patient_code} · {item.doctor_name}</div>
                </div>
                <span className="font-mono font-bold text-blue-700 text-sm flex-shrink-0">{item.token_display}</span>
              </div>

              {/* Payment mode */}
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1.5">Payment Mode</div>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map(m => (
                    <button key={m.key} onClick={() => { setMode(m.key); setTxRef(''); }}
                      className={`py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${mode === m.key ? m.sel : m.idle}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {(mode === 'upi' || mode === 'card') && (
                  <input className="input text-sm py-2 mt-2 animate-fade-up"
                    placeholder={mode === 'upi' ? 'UPI Transaction ID (optional)' : 'Card Last 4 Digits (optional)'}
                    value={txRef} maxLength={mode === 'card' ? 4 : 30}
                    onChange={e => setTxRef(e.target.value)} />
                )}
              </div>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

              <button onClick={collect} disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2">
                {loading ? 'Processing…' : (
                  <>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Collect Procedure Charge · ₹{procAmt.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Pending Procedure Charges Panel ──────────────────────────────────────── */
function PendingProcedurePanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getPendingProcedureCharges();
      setItems(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = items.reduce((s, i) => s + Number(i.procedure_charge), 0);

  return (
    <>
      <div className="rounded-2xl border border-orange-200 shadow-md overflow-hidden animate-fade-up bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-black text-white">
              {items.length}
            </span>
            <span className="text-white font-bold text-sm">Procedure Charges Pending</span>
          </div>
          <button onClick={load} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors" title="Refresh">
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

        {/* Scrollable rows */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div className="text-sm font-semibold text-green-700">All Cleared</div>
              <div className="text-xs text-gray-400">No pending procedure charges</div>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-orange-50/60 transition-colors">
                {/* Token */}
                <span className="flex-shrink-0 font-mono font-black text-blue-700 text-xs bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 min-w-[48px] text-center">
                  {item.token_display}
                </span>
                {/* Name · procedure */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{item.patient_name}</div>
                  <div className="text-xs text-orange-500 font-medium truncate">{item.procedure_label} <span className="text-gray-400">· {item.doctor_name}</span></div>
                </div>
                {/* Amount */}
                <span className="flex-shrink-0 font-black text-orange-600 text-sm">
                  ₹{Number(item.procedure_charge).toLocaleString('en-IN')}
                </span>
                {/* Collect */}
                <button
                  onClick={() => setSelected(item)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white transition-all"
                >
                  Collect
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer total */}
        <div className="px-4 py-2.5 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
          <span className="text-xs text-orange-700 font-medium">Total Due</span>
          <span className="font-black text-orange-600 text-sm">
            {items.length > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
          </span>
        </div>
      </div>

      {selected && (
        <PayProcedureModal
          item={selected}
          onClose={() => setSelected(null)}
          onPaid={() => { load(); }}
        />
      )}
    </>
  );
}

export default function ReceptionPage() {
  const [step, setStep] = useState(() => {
    const s = sessionStorage.getItem('reception_step') || STEPS.SEARCH;
    const hasPatient = !!sessionStorage.getItem('reception_patient');
    const hasAppt    = !!sessionStorage.getItem('reception_appointment');
    if (s === STEPS.BOOK && !hasPatient) return STEPS.SEARCH;
    if ((s === STEPS.PAYMENT || s === STEPS.RECEIPT) && (!hasPatient || !hasAppt)) return STEPS.SEARCH;
    return s;
  });
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('phone');
  const searchInputRef = useRef();
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState(() => {
    try { const p = sessionStorage.getItem('reception_patient'); return p ? JSON.parse(p) : null; } catch { return null; }
  });
  const [appointment, setAppointment] = useState(() => {
    try { const a = sessionStorage.getItem('reception_appointment'); return a ? JSON.parse(a) : null; } catch { return null; }
  });
  const [selectedDoctor, setSelectedDoctor] = useState(() => {
    try { const d = sessionStorage.getItem('reception_doctor'); return d ? JSON.parse(d) : null; } catch { return null; }
  });
  const [receipt, setReceipt] = useState(() => {
    try { const r = sessionStorage.getItem('reception_receipt'); return r ? JSON.parse(r) : null; } catch { return null; }
  });

  useEffect(() => {
    sessionStorage.setItem('reception_step', step);
    if (selectedPatient) sessionStorage.setItem('reception_patient', JSON.stringify(selectedPatient)); else sessionStorage.removeItem('reception_patient');
    if (appointment) sessionStorage.setItem('reception_appointment', JSON.stringify(appointment)); else sessionStorage.removeItem('reception_appointment');
    if (selectedDoctor) sessionStorage.setItem('reception_doctor', JSON.stringify(selectedDoctor)); else sessionStorage.removeItem('reception_doctor');
    if (receipt) sessionStorage.setItem('reception_receipt', JSON.stringify(receipt)); else sessionStorage.removeItem('reception_receipt');
  }, [step, selectedPatient, appointment, selectedDoctor, receipt]);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    const params = { [searchType]: query };
    const { data } = await searchPatients(params);
    setResults(data);
    setSearched(true);
    setLoading(false);
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setStep(STEPS.BOOK);
  };

  const onBooked = (apt, doctor) => {
    setAppointment(apt);
    setSelectedDoctor(doctor);
    setStep(STEPS.PAYMENT);
  };

  const onPaid = (rcpt) => {
    setReceipt(rcpt);
    setStep(STEPS.RECEIPT);
  };

  const onSkipPayment = () => {
    setReceipt(null);
    setStep(STEPS.RECEIPT);
  };

  const reset = () => {
    setStep(STEPS.SEARCH);
    setQuery('');
    setResults([]);
    setSearched(false);
    setSelectedPatient(null);
    setAppointment(null);
    setSelectedDoctor(null);
    setReceipt(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 animate-fade-up">
        <h1 className="page-title">Reception</h1>
        {step !== STEPS.SEARCH && (
          <button className="btn-secondary text-sm ml-auto" onClick={reset}>← Start Over</button>
        )}
      </div>

      <StepBar step={step} />

      {step === STEPS.SEARCH && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left: search + results/info */}
          <div className="lg:col-span-2 space-y-4">
          <div className="card animate-fade-up delay-75">
            <form onSubmit={search} className="flex flex-col xs:flex-row gap-2">
              <select
                className="input w-36 flex-shrink-0"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="phone">Phone</option>
                <option value="name">Name</option>
                <option value="patient_id">Patient ID</option>
              </select>
              <input
                ref={searchInputRef}
                className="input flex-1"
                placeholder={searchType === 'phone' ? 'Enter phone number...' : searchType === 'name' ? 'Enter patient name...' : 'Enter patient ID...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '...' : 'Search'}
              </button>
            </form>
          </div>

          {searched && (
            <div className="space-y-2">
              {results.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500">{results.length} patient(s) found</p>
                  {results.map((p) => <PatientCard key={p.id} patient={p} onSelect={selectPatient} />)}
                </>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">No patient found for "{query}"</p>
                  <button
                    className="btn-primary"
                    onClick={() => { setStep(STEPS.REGISTER); }}
                  >
                    + Register New Patient
                  </button>
                </div>
              )}
            </div>
          )}

          {!searched && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Search tip card — clickable, focuses search input */}
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="card flex items-start gap-4 py-5 text-left hover:border-blue-300 hover:shadow-md border border-transparent transition-all group w-full"
              >
                <div className="bg-blue-100 text-blue-600 rounded-xl p-3 flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">Find Existing Patient</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Search by phone number, full name, or Patient ID to quickly pull up their record and book an appointment.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600">
                    Click to search
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>

              {/* Register new card */}
              <button
                onClick={() => setStep(STEPS.REGISTER)}
                className="card flex items-start gap-4 py-5 text-left hover:border-blue-300 hover:shadow-md border border-transparent transition-all group"
              >
                <div className="bg-green-100 text-green-600 rounded-xl p-3 flex-shrink-0 group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm group-hover:text-green-700 transition-colors">
                    Register New Patient
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    First visit? Register with name, phone & optional Aadhaar / PAN scan to auto-fill details instantly.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
                    Get started
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>
            </div>
          )}
          </div>

          {/* Right column: pending procedure charges (if enabled in Admin Settings) */}
          {localStorage.getItem('reception_proc_panel_enabled') !== 'false' && (
            <div className="lg:col-span-1">
              <PendingProcedurePanel />
            </div>
          )}
        </div>
      )}

      {step === STEPS.REGISTER && (
        <RegisterForm
          phone={searchType === 'phone' ? query : ''}
          onRegistered={(p) => { setSelectedPatient(p); setStep(STEPS.BOOK); }}
        />
      )}

      {step === STEPS.BOOK && selectedPatient && (
        <BookAppointment patient={selectedPatient} onBooked={onBooked} />
      )}

      {step === STEPS.PAYMENT && appointment && selectedPatient && (
        <PaymentStep
          appointment={appointment}
          patient={selectedPatient}
          doctor={selectedDoctor}
          onPaid={onPaid}
          onSkipPayment={onSkipPayment}
        />
      )}

      {step === STEPS.RECEIPT && receipt && (
        <ReceiptView
          receipt={receipt}
          appointment={appointment}
          onNewBooking={reset}
        />
      )}
    </div>
  );
}
