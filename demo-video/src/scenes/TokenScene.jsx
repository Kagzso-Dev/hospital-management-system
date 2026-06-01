import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import { fi, su, fo, C, FONT, card } from '../helpers';

// Story: Arjun is T-007 — T-006 is currently serving, then T-007 gets called
const QUEUE = [
  { token: 'T-007', name: 'Arjun Sharma',  time: '10:00 AM', isHero: true  },
  { token: 'T-008', name: 'Meena Patel',   time: '10:15 AM', isHero: false },
  { token: 'T-009', name: 'Sunita Bose',   time: '10:30 AM', isHero: false },
];

export const TokenScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 18), fo(frame, durationInFrames, 18));

  // At frame 80: T-006 → T-007 (Arjun's turn!)
  const arjunCalled = frame >= 80;
  const servingNum  = arjunCalled ? '007' : '006';
  const servingName = arjunCalled ? 'Arjun Sharma' : 'Priya Nair';
  const servingTime = arjunCalled ? '10:00 AM'     : '09:45 AM';

  const flipSp = frame >= 75 && frame < 100
    ? spring({ frame: frame - 75, fps, config: { damping: 7, stiffness: 260 }, from: 0, to: 1 })
    : frame >= 100 ? 1 : 0;

  const tokenScale = (frame >= 75 && frame < 100)
    ? interpolate(flipSp, [0, 0.5, 1], [1, 1.14, 1])
    : 1;

  const glow = frame >= 75 && frame < 115
    ? interpolate(frame, [75, 90, 115], [0, 1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : frame >= 115 ? 0.3 : 0;

  // "YOUR TURN" banner when Arjun is called
  const bannerOp = arjunCalled ? fi(frame, 82, 16) : 0;
  const bannerY  = arjunCalled ? su(frame, 82, 16, 22) : 0;

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(150deg, #0d1117 0%, #0f172a 45%, #191040 75%, #0d1117 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '48px 80px', opacity: sceneOpacity, fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 44, opacity: fi(frame, 0, 16) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🎫</div>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800, color: C.text }}>Token Display</div>
            <div style={{ fontSize: 13, color: C.muted }}>Room 101 · Dr. Priya Sharma (Cardiologist)</div>
          </div>
        </div>
        <div style={{ ...card(), padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
          <span style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>LIVE</span>
          <span style={{ color: C.muted, fontSize: 13, marginLeft: 6 }}>9:45 AM</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 52, flex: 1 }}>

        {/* Now Serving */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, opacity: fi(frame, 5, 14) }}>
            Now Serving
          </div>

          <div style={{
            transform: `scale(${tokenScale})`,
            ...card(), padding: '44px 52px',
            background: arjunCalled
              ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(99,102,241,0.10))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.13), rgba(139,92,246,0.09))',
            border: `2px solid rgba(${arjunCalled ? '16,185,129' : '99,102,241'},${0.28 + glow * 0.5})`,
            boxShadow: `0 0 ${40 + glow * 80}px rgba(${arjunCalled ? '16,185,129' : '99,102,241'},${0.14 + glow * 0.3})`,
            textAlign: 'center',
            opacity: fi(frame, 10, 18),
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 12, color: arjunCalled ? 'rgba(16,185,129,0.75)' : 'rgba(99,102,241,0.75)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 14 }}>
              TOKEN NUMBER
            </div>
            <div style={{
              fontSize: 128,
              fontWeight: 900,
              background: arjunCalled
                ? 'linear-gradient(90deg, #34d399, #10b981, #059669)'
                : 'linear-gradient(90deg, #67e8f9, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: -4,
              lineHeight: 1,
            }}>
              T-{servingNum}
            </div>
            <div style={{ color: C.text, fontSize: 22, fontWeight: 600, marginTop: 18 }}>{servingName}</div>
            <div style={{ color: C.muted, fontSize: 15, marginTop: 6 }}>{servingTime}</div>
          </div>

          {/* "YOUR TURN" banner */}
          <div style={{
            opacity: bannerOp,
            transform: `translateY(${bannerY}px)`,
            marginTop: 18,
            padding: '14px 28px',
            borderRadius: 14,
            background: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(99,102,241,0.12))',
            border: '1px solid rgba(16,185,129,0.4)',
            textAlign: 'center',
            color: C.green,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 2,
          }}>
            🎉 YOUR TURN, ARJUN SHARMA — Please proceed to Room 101
          </div>
        </div>

        {/* Waiting Queue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, opacity: fi(frame, 68, 14) }}>
            Waiting Queue
          </div>

          {QUEUE.map(({ token, name, time, isHero }, i) => {
            const rs = 72 + i * 14;
            const isCalled = isHero && arjunCalled;
            return (
              <div key={token} style={{
                ...card(), padding: '18px 22px', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 18,
                opacity: isCalled
                  ? interpolate(frame, [80, 95], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  : fi(frame, rs, 14),
                transform: `translateX(${isCalled
                  ? interpolate(frame, [80, 100], [0, 60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  : interpolate(frame, [rs, rs + 14], [-44, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                }px)`,
                border: isHero && !arjunCalled ? '1px solid rgba(99,102,241,0.45)' : `1px solid ${C.border}`,
                background: isHero && !arjunCalled ? 'rgba(99,102,241,0.10)' : C.card,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 13, flexShrink: 0,
                  background: isHero ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isHero ? 'rgba(99,102,241,0.4)' : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: isHero ? C.indigo : C.muted,
                }}>
                  {token}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: isHero ? C.text : C.muted, fontWeight: isHero ? 700 : 400, fontSize: 17 }}>{name}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{time}</div>
                </div>
                <div style={{
                  padding: '5px 14px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)',
                  color: C.amber, fontSize: 12, fontWeight: 600,
                }}>
                  ⏳ Waiting
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
