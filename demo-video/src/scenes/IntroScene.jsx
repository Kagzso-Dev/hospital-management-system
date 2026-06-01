import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring } from 'remotion';
import { fi, su, fo, C, FONT } from '../helpers';

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = Math.min(fi(frame, 0, 12), fo(frame, durationInFrames, 12));

  const timeOp  = fi(frame, 3, 14);
  const timeY   = su(frame, 3, 14, 16);
  const subOp   = fi(frame, 16, 14);
  const subY    = su(frame, 16, 14, 20);
  const logoSc  = spring({ frame: Math.max(0, frame - 24), fps, config: { damping: 12, stiffness: 200 }, from: 0, to: 1 });
  const titleOp = fi(frame, 28, 16);

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(160deg, #030712 0%, #0a0f1a 40%, #0d1117 70%, #130a22 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: sceneOpacity,
      fontFamily: FONT,
    }}>
      {/* Subtle grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />

      {/* Timestamp */}
      <div style={{
        opacity: timeOp,
        transform: `translateY(${timeY}px)`,
        fontSize: 16,
        color: C.muted,
        letterSpacing: 5,
        textTransform: 'uppercase',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
        8:00 AM · Hospital Reception
      </div>

      {/* Story subtitle */}
      <div style={{
        opacity: subOp,
        transform: `translateY(${subY}px)`,
        fontSize: 30,
        color: 'rgba(255,255,255,0.32)',
        fontWeight: 300,
        letterSpacing: 1,
        marginBottom: 40,
        fontStyle: 'italic',
      }}>
        "A patient's journey begins..."
      </div>

      {/* Logo + title */}
      <div style={{ transform: `scale(${logoSc})`, opacity: titleOp, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
          <div style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38,
            boxShadow: '0 18px 56px rgba(99,102,241,0.48)',
          }}>✚</div>
          <div style={{
            fontSize: 50,
            fontWeight: 900,
            background: 'linear-gradient(90deg, #67e8f9, #818cf8, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: -2,
          }}>
            Hospital Management System
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
