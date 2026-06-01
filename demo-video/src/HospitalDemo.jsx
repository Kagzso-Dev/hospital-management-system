import { AbsoluteFill, Sequence } from 'remotion';
import { IntroScene }        from './scenes/IntroScene';
import { ReceptionScene }    from './scenes/ReceptionScene';
import { TokenScene }        from './scenes/TokenScene';
import { DoctorScene }       from './scenes/DoctorScene';
import { PrescriptionScene } from './scenes/PrescriptionScene';
import { OutroScene }        from './scenes/OutroScene';

// Story: Arjun Sharma's patient journey (30 seconds)
//
//   0 -  60   Title Card        (2s) — "A patient's journey begins..."
//  60 - 270   Reception         (7s) — Search → Register → Book → Pay → Token T-007
// 270 - 450   Token Display     (6s) — T-006 serving → T-007 called!
// 450 - 630   Doctor Dashboard  (6s) — T-007 In Progress, AI assistant, suggestion
// 630 - 810   Prescription      (6s) — Diagnosis typed, medicines added, receipt printed
// 810 - 900   Outro             (3s) — Journey recap → "Seamless · Smart · Caring"

export const HospitalDemo = () => (
  <AbsoluteFill style={{ background: '#0d1117' }}>
    <Sequence from={0}   durationInFrames={60}><IntroScene /></Sequence>
    <Sequence from={60}  durationInFrames={210}><ReceptionScene /></Sequence>
    <Sequence from={270} durationInFrames={180}><TokenScene /></Sequence>
    <Sequence from={450} durationInFrames={180}><DoctorScene /></Sequence>
    <Sequence from={630} durationInFrames={180}><PrescriptionScene /></Sequence>
    <Sequence from={810} durationInFrames={90}><OutroScene /></Sequence>
  </AbsoluteFill>
);
