import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import { fi, su, fo, C, FONT, card } from '../helpers';

function typeText(text, frame, start, end) {
  const n = Math.floor(interpolate(frame, [start, end], [0, text.length], { extrapolateRight: 'clamp' }));
  return text.slice(0, n);
}

export const PrescriptionScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 18), fo(frame, durationInFrames, 18));

  // Diagnosis
  const diagText  = typeText('Hypertension — Stage I', frame, 18, 42);
  const cur1      = frame >= 18 && frame < 44 && frame % 16 < 8;

  // Medicine 1
  const med1Name  = typeText('Amlodipine 5mg', frame, 52, 68);
  const cur2      = frame >= 52 && frame < 70 && frame % 16 < 8;

  // Medicine 2
  const med2Name  = typeText('Metoprolol 25mg', frame, 92, 110);
  const cur3      = frame >= 92 && frame < 112 && frame % 16 < 8;

  // Print button & receipt
  const printOp   = fi(frame, 148, 14);
  const receiptSc = spring({ frame: Math.max(0, frame - 158), fps, config: { damping: 12, stiffness: 190 }, from: 0, to: 1 });
  const receiptOp = fi(frame, 158, 16);

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #0a1929 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '48px 80px', opacity: sceneOpacity, fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, opacity: fi(frame, 0, 15) }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>💊</div>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, color: C.text }}>Digital Prescription</div>
          <div style={{ fontSize: 13, color: C.muted }}>Dr. Priya Sharma · Writing for T-007</div>
        </div>
        <div style={{ marginLeft: 'auto', ...card(), padding: '8px 18px', fontSize: 13, color: C.muted }}>
          📅 01 Jun 2026 · 10:02 AM
        </div>
      </div>

      <div style={{ display: 'flex', gap: 40, flex: 1 }}>
        {/* Prescription form */}
        <div style={{ flex: 1, ...card(), padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Patient info row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: fi(frame, 5, 16) }}>
            <div style={{ ...card(), padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>👤 Patient</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 700 }}>Arjun Sharma</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>35 Years · Male · T-007</div>
            </div>
            <div style={{ ...card(), padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>👩‍⚕️ Doctor</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 700 }}>Dr. Priya Sharma</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Cardiologist · Reg #MCI-40821</div>
            </div>
          </div>

          {/* Diagnosis */}
          <div style={{ opacity: fi(frame, 14, 14) }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Diagnosis</div>
            <div style={{
              ...card(), padding: '14px 20px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 18, fontWeight: 600, color: C.text,
              minHeight: 52,
            }}>
              {diagText}{cur1 ? <span style={{ color: C.red }}>|</span> : ''}
            </div>
          </div>

          {/* Medicines */}
          <div style={{ opacity: fi(frame, 44, 14) }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 }}>Medicines</div>

            {/* Medicine 1 */}
            <div style={{
              ...card(), padding: '16px 22px', marginBottom: 12,
              opacity: fi(frame, 48, 14),
              border: '1px solid rgba(99,102,241,0.28)',
              background: 'rgba(99,102,241,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: C.indigo,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: 'white',
                }}>1</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, minWidth: 200 }}>
                  {med1Name}{cur2 ? <span style={{ color: C.indigo }}>|</span> : ''}
                </div>
              </div>
              <div style={{ opacity: fi(frame, 70, 14), paddingLeft: 38 }}>
                <div style={{ fontSize: 14, color: C.muted }}>
                  <span style={{ color: C.cyan }}>1 tablet</span> · Once daily (morning) ·
                  <span style={{ color: C.green }}> 30 days</span>
                </div>
              </div>
            </div>

            {/* Medicine 2 */}
            <div style={{
              ...card(), padding: '16px 22px',
              opacity: fi(frame, 88, 14),
              border: '1px solid rgba(139,92,246,0.28)',
              background: 'rgba(139,92,246,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: C.purple,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: 'white',
                }}>2</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, minWidth: 200 }}>
                  {med2Name}{cur3 ? <span style={{ color: C.purple }}>|</span> : ''}
                </div>
              </div>
              <div style={{ opacity: fi(frame, 112, 14), paddingLeft: 38 }}>
                <div style={{ fontSize: 14, color: C.muted }}>
                  <span style={{ color: C.cyan }}>1 tablet</span> · Twice daily (morning + night) ·
                  <span style={{ color: C.green }}> 30 days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advice */}
          <div style={{ opacity: fi(frame, 124, 15) }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Advice</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
              Low-salt diet · Regular BP monitoring · Avoid stress · Return after 1 month for follow-up.
            </div>
          </div>

          {/* Print button */}
          <div style={{ opacity: printOp }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '14px 32px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: 'white', fontWeight: 700, fontSize: 16,
              boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
              cursor: 'pointer',
            }}>
              🖨️ Print Prescription
            </div>
          </div>
        </div>

        {/* Printed receipt preview */}
        <div style={{
          width: 320,
          transform: `scale(${receiptSc})`,
          opacity: receiptOp,
          ...card(),
          padding: '28px 28px',
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 12,
          color: '#0f172a',
          fontFamily: FONT,
        }}>
          {/* Receipt header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>✚ City Hospital</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Prescription</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <div>
              <div style={{ color: '#64748b' }}>Patient</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Arjun Sharma</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748b' }}>Date</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>01 Jun 2026</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <div style={{ color: '#64748b', marginBottom: 4 }}>Diagnosis</div>
            <div style={{ fontWeight: 600, color: '#dc2626' }}>Hypertension — Stage I</div>
          </div>

          {[
            { n: 'Amlodipine 5mg',  d: '1 tab OD · 30 days'          },
            { n: 'Metoprolol 25mg', d: '1 tab BD · 30 days'           },
          ].map(({ n, d }, i) => (
            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#6366f1' : '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{n}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 1 }}>{d}</div>
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Dr. Priya Sharma, Cardiologist<br />
            Reg #MCI-40821
          </div>

          <div style={{
            textAlign: 'center', fontSize: 11, color: 'white',
            background: '#6366f1', borderRadius: 6, padding: '6px 0', fontWeight: 600,
          }}>
            RX-2026-0047
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
