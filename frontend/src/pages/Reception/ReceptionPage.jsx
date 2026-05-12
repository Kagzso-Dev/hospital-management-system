import React, { useState, useRef, useEffect } from 'react';
import { searchPatients, createPatient, getDoctors, getAvailableSlots, createAppointment } from '../../api';
import PaymentStep from './PaymentStep';
import ReceiptView from './ReceiptView';
import { useToast } from '../../components/Toast';

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

    // 1. Try server-side Python OCR first
    try {
      const formData = new FormData();
      formData.append('file', file);
      setOcrProgress(25);
      const response = await fetch('/api/ocr/extract', { method: 'POST', body: formData });
      const json = await response.json();
      if (response.ok && json.success && json.data) {
        fillFromExtracted(json.data);
        return;
      }
    } catch {
      // server offline — fall through to client-side
    }

    // 2. Client-side OCR with Tesseract.js
    try {
      setOcrProgress(30);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(30 + Math.round(m.progress * 60));
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
      getAvailableSlots(selectedDoctor.id, date)
        .then(({ data }) => { setSlots(data.slots || []); setUnavailable(!!data.unavailable); })
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctor, date]);

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
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Doctor is marked unavailable on this date. Please choose another date or doctor.
            </div>
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

      <button
        className={`btn-primary w-full flex items-center justify-center gap-2 transition-all ${booked ? 'bg-green-600' : ''}`}
        disabled={!selectedDoctor || !selectedSlot || loading || booked}
        onClick={book}
      >
        {loading ? 'Booking...' : booked ? '✓ Appointment Booked' : 'Confirm Appointment'}
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

      {step === STEPS.SEARCH && (
        <div className="space-y-4">
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
