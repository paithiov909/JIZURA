import {Composition, Sequence, staticFile} from 'remotion';
import {center, pop, wipe, drift, breathe, kasumi, checkerStrip, JizuraCut, JizuraScene} from 'remotion-jizura';
import {CustomEffects} from './custom/CustomEffects.tsx';
import {LyricsDemo} from './lyrics.tsx';
import {ReviewWorkbench} from './review/ReviewWorkbench.tsx';

const EmptyScene = () => <JizuraScene durationInFrames={24} background="#16324F" />;
const StaticText = ({fontSrc = staticFile('NotoSansJP.ttf')}: {fontSrc?: string}) => <JizuraScene durationInFrames={24}
  font={{family: 'Noto Sans JP', weight: 700, src: fontSrc}}
  style={{fontSize: 64, track: 0.08, lead: 1.4}} background="#16324F">
  <JizuraCut text={'新しい朝が来た\n*希望*の朝だ ABC 123'} enter={null} exit={null} hold={null} decor={[]} />
</JizuraScene>;
const StaticOverride = () => <JizuraScene durationInFrames={24}
  font={{family: 'Unused Scene Font', src: 'unused-font.ttf'}}
  style={{fontSize: 64, track: 0.08, lead: 1.4, palette: {accent: '#16F4D4'}}} background="#16324F">
  <JizuraCut text={'新しい朝が来た\n*希望*の朝だ ABC 123'}
    font={{family: 'Noto Sans JP', weight: 400, src: staticFile('NotoSansJP.ttf')}}
    style={{palette: {fg: '#B8B8B8', bg: '#FF0000'}, track: 0.12}}
    enter={null} exit={null} hold={null} decor={[]} />
</JizuraScene>;
// Stage 05: static letters switch at integer boundaries. Motion/decor remain
// intentionally disabled here. Includes gaps and a one-frame Cut.
const TimedCuts = ({offset = 0, motionFps = null}: {offset?: number; motionFps?: number | null}) =>
  <Sequence from={offset} durationInFrames={48}>
    <JizuraScene durationInFrames={48} motionFps={motionFps}
      font={{family: 'Noto Sans JP', weight: 700, src: staticFile('NotoSansJP.ttf')}}
      style={{fontSize: 64, track: 0.08}} background="#16324F">
      <JizuraCut text="*夜*が来た" from={30} durationInFrames={18} enter={null} exit={null} hold={null} decor={[]} />
      <JizuraCut text="新しい*朝*" from={0} durationInFrames={10} enter={null} exit={null} hold={null} decor={[]} />
      <JizuraCut text="一瞬" from={10} durationInFrames={1} enter={null} exit={null} hold={null} decor={[]} />
      <JizuraCut text="昼の光" from={15} durationInFrames={15} enter={null} exit={null} hold={null} decor={[]} />
    </JizuraScene>
  </Sequence>;
// Stage06: fixed/partial/automatic/disabled and repeated front/back effects.
export const EffectSamples = ({mode = 'fixed', seed = 1234, motionFps = null, offset = 0}: {mode?: string; seed?: number; motionFps?: number | null; offset?: number}) => {
  const layout = center({seed: 123, params: {sx: 1, track: 0.08, ox: 0, oy: 0, sub: false, under: false, accent: false}});
  const different = mode === 'seedDifferent', effectSeed = different ? 999 : 123;
  const fixed = {text: '新しい*朝*が来た', layout, enter: pop({seed: effectSeed}), hold: breathe({seed: 123}), exit: drift({seed: effectSeed}),
    decor: [kasumi({seed: different ? 999 : 889}), checkerStrip({seed: different ? 999 : 721})]};
  const cut = mode === 'automatic' ? {text: '希望の*朝*'}
    : mode === 'partial' ? {text: '喜びに*胸*を開け', hold: 'breathe' as const, decor: [kasumi({seed: 889}), checkerStrip({seed: 721})]}
    : mode === 'disabled' ? {...fixed, enter: null, exit: null, hold: null, decor: []}
    : mode === 'repeated' ? {...fixed, enter: wipe({seed: 123}), decor: [checkerStrip({seed: 2}), kasumi({seed: 0}), kasumi({seed: 889}), checkerStrip({seed: 3}), kasumi({seed: 0})]}
    : fixed;
  return <Sequence from={offset} durationInFrames={61}><JizuraScene durationInFrames={60} seed={seed} motionFps={motionFps}
    font={{family: 'Noto Sans JP', weight: 700, src: staticFile('NotoSansJP.ttf')}} style={{fontSize: 64}} background="#16324F"><JizuraCut {...cut} /></JizuraScene></Sequence>;
};
export const Root = () => <>
  <Composition id="CustomEffects" component={CustomEffects} defaultProps={{amplitude: 12}} width={640} height={360} fps={24} durationInFrames={120} />
  <Composition id="ReviewWorkbench" component={ReviewWorkbench} defaultProps={{candidate: "combined"}} width={640} height={360} fps={24} durationInFrames={120} />
  <Composition id="LyricsDemo" component={LyricsDemo} defaultProps={{seed: 20260922, cutSeed: 1234}} width={640} height={360} fps={24} durationInFrames={120} />
  <Composition id="EffectSamples" component={EffectSamples} defaultProps={{mode: "fixed", seed: 1234, motionFps: null, offset: 0}} width={640} height={360} fps={24} durationInFrames={120} />
  <Composition id="EmptyScene" component={EmptyScene} width={640} height={360} fps={24} durationInFrames={24} />
  <Composition id="StaticText" component={StaticText} defaultProps={{}} width={960} height={540} fps={24} durationInFrames={24} />
  <Composition id="StaticOverride" component={StaticOverride} width={960} height={540} fps={24} durationInFrames={24} />
  <Composition id="TimedCuts" component={TimedCuts} defaultProps={{offset: 0, motionFps: null}} width={640} height={360} fps={24} durationInFrames={120} />
</>;
