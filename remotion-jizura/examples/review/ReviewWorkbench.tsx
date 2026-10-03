import {staticFile} from 'remotion';
import {JizuraCut, JizuraScene} from 'remotion-jizura';
import type {ReviewProps} from './inputs.tsx';
import {reviewInputs} from './inputs.tsx';

export const ReviewWorkbench = ({input, candidate = 'combined', fontSrc = staticFile('NotoSansJP.ttf')}: ReviewProps) => {
  const selected = input ?? reviewInputs[candidate];
  if (!selected) throw new Error(`Unknown review candidate: ${candidate}`);
  return <JizuraScene durationInFrames={120} seed={20260922} width={640} height={360}
    font={{family: 'Noto Sans JP', weight: 700, src: fontSrc}}
    style={{fontSize: 64}} background="#16324F">
    {selected.cuts.map(({id, cut}) => <JizuraCut key={id} {...cut} />)}
  </JizuraScene>;
};
