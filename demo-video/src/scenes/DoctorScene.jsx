import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import { fi, su, fo, C, FONT, card } from '../helpers';

// Story: T-007 (Arjun Sharma) is now In Progress
const PATIENTS = [
  { token: 'T-003', name: 'Ravi Kumar',    time: '09:00 AM', status: 'completed'   },
  { token: 'T-004', name: 'Lata Menon',    time: '09:15 AM', status: 'completed'   },
  { token: 'T-005', name: 'Suresh Patel',  time: '09:30 AM', status: 'completed'   },
  { token: 'T-006', name: 'Priya Nair',    time: '09:45 AM', status: 'completed'   },
  { token: 'T-007', name: 'Arjun Sharma',  time: '10:00 AM', status: 'in_progress' }, // our hero
  { token: 'T-008', name: 'Meena Patel',   time: '10:15 AM', status: 'waiting'     },
];

const STATUS = {
  completed:   { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)', color: '#10b981', label: '✅ Done'        },
  in_progress: { bg: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.4)',  color: '#3b82f6', label: '🔵 In Progress' },
  waiting:     { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)', color: '#f59e0b', label: '⏳ Waiting'     },
};

const STATS = [
  { label: 'Total',       val: '12', color: C.indigo, icon: '👥' },
  { label: 'Completed',   val: '4',  color: C.green,  icon: '✅' },
  { label: 'In Progress', val: '1',  color: C.blue,   icon: '🔵' },
  { label: 'Waiting',     val: '7',  color: C.amber,  icon: '⏳' },
];

export const DoctorScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 18), fo(frame, durationInFrames, 18));

  const chatOp = fi(frame, 144, 20);
  const chatX  = interpolate(frame, [144, 164], [64, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #0f172a 60%, #0a1929 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '48px 80px', opacity: sceneOpacity, fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, opacity: fi(frame, 0, 15) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>👩‍⚕️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Dr. Priya Sharma</div>
            <div style={{ fontSize: 13, color: C.muted }}>Cardiologist · Room 101</div>
          </div>
        </div>
        <div style={{ ...card(), padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue }} />
          <span style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>In Session</span>
          <span style={{ color: C.muted, fontSize: 13, marginLeft: 6 }}>10:00 AM</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
        {STATS.map(({ label, val, color, icon }, i) => {
          const sc = spring({ frame: Math.max(0, frame - 8 - i * 12), fps, config: { damping: 14, stiffness: 200 }, from: 0, to: 1 });
          return (
            <div key={label} style={{
              ...card(), flex: 1, padding: '20px 24px',
              transform: `scale(${sc})`,
              border: `1px solid ${color}33`,
              background: `${color}0e`,
            }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 7 }}>{icon} {label}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
            </div>
          );
        })}
      </div>

      {/* Table + Chatbot */}
      <div style={{ display: 'flex', gap: 22, flex: 1 }}>
        {/* Patient table */}
        <div style={{ flex: 1, ...card(), padding: '22px 28px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 130px 175px', gap: 16,
            fontSize: 11, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase',
            marginBottom: 12, paddingBottom: 12,
            borderBottom: `1px solid ${C.border}`,
            opacity: fi(frame, 36, 15),
          }}>
            <div>Token</div><div>Patient</div><div>Time</div><div>Status</div>
          </div>

          {PATIENTS.map(({ token, name, time, status }, i) => {
            const rs    = 46 + i * 14;
            const s     = STATUS[status];
            const isHero = token === 'T-007';
            return (
              <div key={token} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 130px 175px', gap: 16,
                padding: '12px 8px',
                borderRadius: isHero ? 10 : 0,
                borderBottom: i < PATIENTS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                background: isHero ? 'rgba(59,130,246,0.07)' : 'transparent',
                opacity: fi(frame, rs, 14),
                transform: `translateY(${su(frame, rs, 14, 16)}px)`,
                alignItems: 'center',
              }}>
                <div style={{ color: isHero ? C.blue : C.indigo, fontWeight: 700, fontSize: 14 }}>{token}</div>
                <div style={{ color: isHero ? C.text : 'rgba(255,255,255,0.65)', fontWeight: isHero ? 700 : 400, fontSize: 15 }}>{name}</div>
                <div style={{ color: C.muted, fontSize: 14 }}>{time}</div>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                    fontSize: 12, fontWeight: 600,
                  }}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Chatbot */}
        <div style={{
          width: 316, ...card(), padding: '22px 26px',
          opacity: chatOp, transform: `translateX(${chatX}px)`,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>🤖</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>AI Assistant</div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: C.green }} />
          </div>

          <div style={{
            ...card(), padding: '14px 18px',
            background: 'rgba(99,102,241,0.10)',
            border: '1px solid rgba(99,102,241,0.22)',
          }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
              Current Patient
            </div>
            <div style={{ fontSize: 16, color: C.text, fontWeight: 700, marginBottom: 6 }}>Arjun Sharma · T-007</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
              Age: 35 · Male · First visit<br />
              Chief complaint: <span style={{ color: C.amber }}>Chest tightness</span><br />
              BP: <span style={{ color: C.red }}>145/95 mmHg</span>
            </div>
          </div>

          <div style={{ ...card(), padding: '13px 18px', opacity: fi(frame, 162, 15) }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, letterSpacing: 1.5, textTransform: 'uppercase' }}>Suggestion</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
              Consider BP management.<br />
              <span style={{ color: C.indigo }}>Amlodipine</span> or <span style={{ color: C.indigo }}>Metoprolol</span> indicated.
            </div>
          </div>

          <div style={{
            opacity: fi(frame, 172, 15),
            padding: '10px 16px', borderRadius: 10,
            background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)',
            color: C.blue, fontSize: 13, fontWeight: 600, textAlign: 'center',
          }}>
            📝 Ready to write prescription →
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
