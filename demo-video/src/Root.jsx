import { Composition } from 'remotion';
import { HospitalDemo } from './HospitalDemo';

export const Root = () => (
  <Composition
    id="HospitalDemo"
    component={HospitalDemo}
    durationInFrames={900}
    fps={30}
    width={1920}
    height={1080}
  />
);
