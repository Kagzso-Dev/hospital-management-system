import { useState, useRef, useCallback, useEffect } from 'react';
import { extractWithAI, readHandwriting } from '../api';

const PLACEHOLDERS = {
  consultation:
    'Write your clinical notes freely...\n\ne.g. "Patient has hypertension. BP 145/95. Give Amlodipine 5mg once daily 30 days and Metoprolol 25mg twice daily 30 days. Low salt diet."',
  patient:
    'Write patient details freely...\n\ne.g. "Name Rajan Kumar, 42 year old male, phone 9876543210, Chennai address"',
};

const getCanvasPos = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
};

function ResultPreview({ result }) {
  return (
    <div className="bg-white rounded-xl border border-violet-200 p-3 space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-violet-700 font-semibold pb-1 border-b border-violet-100">
        ✅ AI Extracted — review before applying
      </div>
      {result.diagnosis && <PreviewRow label="Diagnosis" value={result.diagnosis} />}
      {result.medicines?.length > 0 && (
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 flex-shrink-0">Medicines</span>
          <div className="space-y-0.5">
            {result.medicines.map((m, i) => (
              <div key={i} className="text-gray-700">
                <span className="font-medium">{m.medicine_name}</span>
                {m.dosage && <span className="text-gray-500"> {m.dosage}</span>}
                {' — '}
                <span className="text-indigo-600 font-medium">
                  {[m.morning && 'M', m.afternoon && 'A', m.night && 'N'].filter(Boolean).join('-') || '—'}
                </span>
                {m.duration ? <span className="text-gray-400"> × {m.duration}d</span> : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {result.name    && <PreviewRow label="Name"       value={result.name} />}
      {result.phone   && <PreviewRow label="Phone"      value={result.phone} />}
      {result.age     && <PreviewRow label="Age/Gender" value={`${result.age} · ${result.gender}`} />}
      {result.address && <PreviewRow label="Address"    value={result.address} />}
      {result.notes   && <PreviewRow label="Notes"      value={result.notes} />}
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-800 break-words min-w-0">{value}</span>
    </div>
  );
}

export default function SmartPad({ mode = 'consultation', onExtract, disabled }) {
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState('type');
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const canvasRef  = useRef(null);
  const drawingRef = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  // Fill canvas white once when SmartPad opens — NOT on tab switch
  // Canvas is always mounted when open (CSS show/hide) so drawing is preserved
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, 20);
    return () => clearTimeout(id);
  }, [open]); // ← intentionally NOT including `tab` — preserves drawing between tab switches

  // ── Canvas helpers — hooks must be declared before any early return ─────────
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    lastPos.current = getCanvasPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e, canvas);
    ctx.beginPath();
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const stopDraw = useCallback((e) => {
    e?.preventDefault();
    drawingRef.current = false;
  }, []);

  if (disabled) return null;

  // ── Handwriting read ──────────────────────────────────────────────────────
  const handleReadHandwriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasInk = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) { hasInk = true; break; }
    }
    if (!hasInk) { setError('Canvas is empty — write something first.'); return; }

    setReading(true);
    setError('');
    try {
      const base64 = canvas.toDataURL('image/png').replace('data:image/png;base64,', '');
      const { data: res } = await readHandwriting(base64);
      if (res.text) {
        setText((prev) => (prev ? `${prev}\n${res.text}` : res.text));
        setTab('type');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not read handwriting. Check your Groq API key.');
    }
    setReading(false);
  };

  // ── Text extract ──────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await extractWithAI(text, mode);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'AI extraction failed. Check your Groq API key.');
    }
    setLoading(false);
  };

  // ── Apply + clear ─────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!result) return;
    onExtract(result);
    setOpen(false);
    setText('');
    setResult(null);
    setError('');
    clearCanvas();
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError('');
    clearCanvas();
  };

  const hasContent = text.trim() || result;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 overflow-hidden">

      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-violet-100/60 transition-colors"
      >
        <span className="text-base leading-none">✨</span>
        <span className="text-sm font-semibold text-violet-700">Smart Write Pad</span>
        <span className="hidden sm:inline text-xs text-violet-400 ml-1">
          — type or draw, AI fills the form
        </span>
        <svg
          className={`w-4 h-4 text-violet-400 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div className="px-4 pb-4 border-t border-violet-100">

          {/* Tab switcher */}
          <div className="flex gap-1 mt-3 mb-3 bg-white border border-violet-200 rounded-lg p-0.5 w-fit">
            <TabBtn active={tab === 'type'} onClick={() => setTab('type')} label="⌨️ Type" />
            <TabBtn active={tab === 'draw'} onClick={() => setTab('draw')} label="✏️ Draw" />
          </div>

          {/* ── TYPE tab ── */}
          {tab === 'type' && (
            <textarea
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none leading-relaxed"
              rows={5}
              placeholder={PLACEHOLDERS[mode] || PLACEHOLDERS.consultation}
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); setError(''); }}
            />
          )}

          {/* ── DRAW tab — always mounted (CSS hide/show) so drawing is preserved ── */}
          <div style={{ display: tab === 'draw' ? 'block' : 'none' }}>
            <canvas
              ref={canvasRef}
              width={900}
              height={220}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: 10,
                border: '1.5px solid #ddd6fe',
                cursor: 'crosshair',
                touchAction: 'none',
                background: '#ffffff',
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Draw with mouse or finger · AI reads and converts to text
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleReadHandwriting}
                disabled={reading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reading ? <><Spinner /> Reading...</> : '🔍 Read Handwriting with AI'}
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-medium transition-colors"
              >
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
              <span className="mt-0.5 flex-shrink-0">⚠️</span> {error}
            </div>
          )}

          {/* AI result preview */}
          {result && (
            <div className="mt-3">
              <ResultPreview result={result} />
            </div>
          )}

          {/* Action buttons */}
          {(tab === 'type' || result || hasContent) && (
            <div className="flex gap-2 mt-3">
              {tab === 'type' && (
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={loading || !text.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <><Spinner /> Extracting...</> : '✨ Extract with AI'}
                </button>
              )}
              {result && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  ✓ Apply to Form
                </button>
              )}
              {hasContent && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors"
                  title="Clear all"
                >
                  ✕
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
        active ? 'bg-violet-600 text-white shadow-sm' : 'text-violet-500 hover:text-violet-700'
      }`}
    >
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
