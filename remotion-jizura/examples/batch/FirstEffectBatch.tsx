import {staticFile} from 'remotion';
import {JizuraScene, JizuraCut, center, mixed, slideLeft, shrink, jitter, brackets, breathe} from 'remotion-jizura';
export type BatchProps = {candidate?: string; fontSrc?: string; amount?: number; rotAmp?: number};
export const FirstEffectBatch = ({candidate = 'combined', fontSrc = staticFile('NotoSansJP.ttf'), amount = 1, rotAmp = 6}: BatchProps) => {
  const combined = candidate === 'combined';
  return <JizuraScene durationInFrames={60} background="#16324F" font={{family: 'Noto Sans JP', weight: 700, src: fontSrc}} style={{fontSize: 64}}>
    <JizuraCut text="新しい*朝* ABC！" seed={1234} from={1} durationInFrames={58}
      enterDurationInFrames={combined || candidate === 'slideLeft' ? 12 : 0}
      exitDurationInFrames={combined || candidate === 'shrink' ? 14 : 0}
      layout={combined || candidate === 'mixed' ? mixed({seed: 20, params: {mode: 'wave', rotAmp, smallK: 0.5, accentIdx: 2}})
        : center({seed: 20, params: {sx: 1, track: 0.08, ox: 0, oy: 0, sub: false, under: false, accent: false}})}
      enter={combined || candidate === 'slideLeft' ? slideLeft({seed: 30}) : null}
      exit={combined || candidate === 'shrink' ? shrink({seed: 40}) : null}
      hold={combined || candidate === 'jitter' ? jitter({seed: 50, params: {amount}}) : candidate === 'shrink' ? breathe({seed: 50}) : null}
      decor={combined || candidate === 'brackets' ? [brackets({seed: 60, params: {pad: 18, stroke: 2.2, accent: false}})] : []} />
  </JizuraScene>;
};
