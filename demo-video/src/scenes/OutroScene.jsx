import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring } from 'remotion';
import { fi, su, fo, C, FONT, card } from '../helpers';

const JOURNEY = [
  { icon: '🏥', step: 'Reception',    desc: 'Registered in 60 seconds'     },
  { icon: '🎫', step: 'Token T-007',  desc: 'Called on time, no waiting'   },
  { icon: '👩‍⚕️', step: 'Consultation', desc: 'AI-assisted diagnosis'         },
  { icon: '💊', step: 'Prescription', desc: 'Printed & archived digitally'  },
];

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 18), fo(frame, durationInFrames, 16));

  const logoSc   = spring({ frame: Math.max(0, frame - 68), fps, config: { damping: 12, stiffness: 200 }, from: 0, to: 1 });
  const titleOp  = fi(frame, 76, 18);
  const titleY   = su(frame, 76, 18, 28);
  const taglineOp = fi(frame, 92, 16);
  const taglineY  = su(frame, 92, 16, 18);

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #0f172a 50%, #1a0533 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: sceneOpacity, fontFamily: FONT,
      padding: '60px 120px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Journey steps — horizontal flow */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 64, alignItems: 'center', width: '100%', maxWidth: 1300 }}>
        {JOURNEY.map(({ icon, step, desc }, i) => (
          <>
            <div key={step} style={{
              flex: 1,
              ...card(), padding: '28px 24px',
              textAlign: 'center',
              opacity: fi(frame, i * 14, 18),
              transform: `translateY(${su(frame, i * 14, 18, 28)}px)`,
              border: `1px solid rgba(99,102,241,${0.1 + i * 0.06})`,
              background: `rgba(99,102,241,${0.03 + i * 0.02})`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>{step}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{desc}</div>
            </div>
            {i < JOURNEY.length - 1 && (
              <div key={`arrow-${i}`} style={{
                opacity: fi(frame, (i + 1) * 14 - 4, 14),
                fontSize: 28, color: C.indigo, margin: '0 8px', flexShrink: 0,
              }}>→</div>
            )}
          </>
        ))}
      </div>

      {/* Logo */}
      <div style={{ transform: `scale(${logoSc})` }}>
        <div style={{
          width: 76, height: 76, borderRadius: 22,
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, margin: '0 auto 22px',
          boxShadow: '0 18px 52px rgba(99,102,241,0.44)',
        }}>✚</div>
      </div>

      {/* Title */}
      <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center', marginBottom: 14 }}>
        <div style={{
          fontSize: 46, fontWeight: 900,
          background: 'linear-gradient(90deg, #67e8f9, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -1.5,
        }}>
          Hospital Management System
        </div>
      </div>

      {/* Tagline */}
      <div style={{ opacity: taglineOp, transform: `translateY(${taglineY}px)`, fontSize: 17, color: C.muted, letterSpacing: 4, textTransform: 'uppercase' }}>
        Seamless · Smart · Caring
      </div>
    </AbsoluteFill>
  );
};
