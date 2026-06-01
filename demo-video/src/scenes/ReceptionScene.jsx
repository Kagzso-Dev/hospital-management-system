import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import { fi, su, fo, C, FONT, card } from '../helpers';

// ── Step sub-components ───────────────────────────────────────────────────────

function ArrivalStep({ frame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        ...card(),
        padding: '20px 26px',
        opacity: fi(frame, 4, 15),
        transform: `translateY(${su(frame, 4, 15, 20)}px)`,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ fontSize: 44 }}>🚶</div>
        <div>
          <div style={{ color: C.text, fontSize: 19, fontWeight: 700 }}>Patient walked in</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>New visit · No prior records found</div>
        </div>
      </div>

      <div style={{
        ...card(),
        padding: '18px 24px',
        opacity: fi(frame, 17, 14),
        transform: `translateY(${su(frame, 17, 14, 18)}px)`,
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.28)',
      }}>
        <div style={{ fontSize: 14, color: C.blue, fontWeight: 700, marginBottom: 7 }}>🔍 Patient Search</div>
        <div style={{ fontSize: 16, color: C.text }}>
          "Arjun Sharma" — <span style={{ color: C.muted }}>No records found</span>
        </div>
        <div style={{ fontSize: 13, color: C.blue, marginTop: 7 }}>→ Starting new patient registration...</div>
      </div>
    </div>
  );
}

function RegistrationStep({ frame }) {
  const NAME  = 'Arjun Sharma';
  const PHONE = '9876543210';
  const nameCh  = Math.floor(interpolate(frame, [5, 22],  [0, NAME.length],  { extrapolateRight: 'clamp' }));
  const phoneCh = Math.floor(interpolate(frame, [18, 32], [0, PHONE.length], { extrapolateRight: 'clamp' }));
  const cur     = frame % 18 < 9;

  const fields = [
    { label: 'Full Name', icon: '👤', value: NAME.slice(0, nameCh)   + (nameCh  < NAME.length  && cur ? '|' : ''), delay: 3  },
    { label: 'Phone',     icon: '📞', value: PHONE.slice(0, phoneCh) + (phoneCh < PHONE.length && cur ? '|' : ''), delay: 16 },
    { label: 'Age',       icon: '🗓️', value: fi(frame, 28, 10) > 0.5 ? '35 Years'  : '',                          delay: 26 },
    { label: 'Gender',    icon: '👥', value: fi(frame, 32, 10) > 0.5 ? 'Male'      : '',                          delay: 30 },
  ];

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Patient Registration</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {fields.map(({ label, icon, value, delay }) => (
          <div key={label} style={{ ...card(), padding: '14px 18px', opacity: fi(frame, delay - 2, 12) }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{icon} {label}</div>
            <div style={{ fontSize: 17, color: C.text, minHeight: 26, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorStep({ frame }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Doctor Selection</div>
      <div style={{
        ...card(), padding: '22px 28px', marginBottom: 14,
        opacity: fi(frame, 8, 16),
        transform: `translateX(${interpolate(frame, [8, 24], [-32, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
        border: '1px solid rgba(99,102,241,0.5)',
        background: 'rgba(99,102,241,0.10)',
        boxShadow: '0 0 30px rgba(99,102,241,0.18)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>👩‍⚕️ Dr. Priya Sharma</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Cardiologist · Room 101</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.indigo, fontWeight: 700, fontSize: 17 }}>10:00 AM</div>
          <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>✓ Available</div>
        </div>
      </div>
      <div style={{
        opacity: fi(frame, 26, 14),
        ...card(), padding: '13px 20px',
        display: 'flex', gap: 12, alignItems: 'center',
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
      }}>
        <span style={{ fontSize: 18 }}>🏷️</span>
        <div style={{ color: C.text, fontSize: 14 }}>
          Slot confirmed: <strong style={{ color: C.green }}>10:00 AM</strong> · 30 min consultation
        </div>
      </div>
    </div>
  );
}

function PayStep({ frame }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Payment</div>
      <div style={{ ...card(), padding: '24px 28px', opacity: fi(frame, 5, 15) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 17 }}>Consultation Fee</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Dr. Priya Sharma · Cardiologist</div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.text }}>₹ 500</div>
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 18 }} />
        <div style={{
          opacity: fi(frame, 13, 14),
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 22px', borderRadius: 10,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
          color: C.green, fontWeight: 700, fontSize: 15,
        }}>
          💵 Cash Payment Selected
        </div>
      </div>
      <div style={{
        opacity: fi(frame, 28, 14), marginTop: 14,
        ...card(), padding: '13px 22px',
        background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)',
        color: C.green, fontWeight: 600, textAlign: 'center', fontSize: 15,
      }}>
        ✅ ₹ 500 received · Receipt generated
      </div>
    </div>
  );
}

function TokenReveal({ frame, fps }) {
  const sc   = spring({ frame, fps, config: { damping: 9, stiffness: 180 }, from: 0, to: 1 });
  const glow = interpolate(frame, [8, 28, 50], [0, 1, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
      <div style={{ fontSize: 13, color: C.muted, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 24, opacity: fi(frame, 4, 14) }}>
        Token Issued Successfully
      </div>
      <div style={{
        transform: `scale(${sc})`,
        ...card(), padding: '40px 88px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(59,130,246,0.10))',
        border: `2px solid rgba(99,102,241,${0.3 + glow * 0.5})`,
        boxShadow: `0 0 ${50 + glow * 90}px rgba(99,102,241,${0.18 + glow * 0.32})`,
        marginBottom: 26,
      }}>
        <div style={{ fontSize: 12, color: 'rgba(99,102,241,0.75)', letterSpacing: 5, textTransform: 'uppercase', marginBottom: 12 }}>
          Your Token Number
        </div>
        <div style={{
          fontSize: 108,
          fontWeight: 900,
          background: 'linear-gradient(90deg, #67e8f9, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -4,
          lineHeight: 1,
        }}>
          T-007
        </div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 600, marginTop: 16 }}>Arjun Sharma</div>
        <div style={{ color: C.muted, fontSize: 15, marginTop: 5 }}>10:00 AM · Dr. Priya Sharma</div>
      </div>
      <div style={{ display: 'flex', gap: 18, opacity: fi(frame, 22, 14) }}>
        <div style={{ ...card(), padding: '10px 20px', color: C.green, fontSize: 13, fontWeight: 600 }}>✅ Appointment Confirmed</div>
        <div style={{ ...card(), padding: '10px 20px', color: C.muted, fontSize: 13 }}>💊 Cardiology</div>
      </div>
    </div>
  );
}

// ── Main scene ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Patient Arrives', icon: '🚶' },
  { label: 'Registration',    icon: '📋' },
  { label: 'Book Doctor',     icon: '👩‍⚕️' },
  { label: 'Payment',         icon: '💳' },
  { label: 'Token Issued',    icon: '🎫' },
];

export const ReceptionScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 18), fo(frame, durationInFrames, 18));

  const stepIndex = frame < 42 ? 0 : frame < 84 ? 1 : frame < 126 ? 2 : frame < 168 ? 3 : 4;
  const stepFrame = (
    frame < 42  ? frame :
    frame < 84  ? frame - 42  :
    frame < 126 ? frame - 84  :
    frame < 168 ? frame - 126 : frame - 168
  );

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #0f172a 60%, #110a2a 100%)',
      display: 'flex', flexDirection: 'column',
      opacity: sceneOpacity, fontFamily: FONT, padding: '44px 80px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🏥</div>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, color: C.text }}>Reception</div>
          <div style={{ fontSize: 13, color: C.muted }}>Arjun Sharma · New Visit</div>
        </div>
        <div style={{
          marginLeft: 'auto', ...card(), padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
          <span style={{ color: C.muted, fontSize: 13 }}>8:00 AM</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 44, flex: 1 }}>
        {/* Sidebar steps */}
        <div style={{ width: 248, flexShrink: 0 }}>
          {STEPS.map(({ label, icon }, i) => {
            const isActive = i === stepIndex;
            const isDone   = i < stepIndex;
            return (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 15px', marginBottom: 8, borderRadius: 12,
                opacity: fi(frame, i * 7, 13),
                background: isActive ? 'rgba(99,102,241,0.12)' : isDone ? 'rgba(16,185,129,0.06)' : 'transparent',
                border: `1px solid ${isActive ? C.indigo : isDone ? C.green : 'transparent'}`,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? C.indigo : isDone ? C.green : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}>
                  {isDone ? '✓' : icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? C.text : isDone ? C.green : C.muted }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, ...card(), padding: '32px 38px' }}>
          {stepIndex === 0 && <ArrivalStep      frame={stepFrame} />}
          {stepIndex === 1 && <RegistrationStep frame={stepFrame} />}
          {stepIndex === 2 && <DoctorStep       frame={stepFrame} />}
          {stepIndex === 3 && <PayStep          frame={stepFrame} />}
          {stepIndex === 4 && <TokenReveal      frame={stepFrame} fps={fps} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};
