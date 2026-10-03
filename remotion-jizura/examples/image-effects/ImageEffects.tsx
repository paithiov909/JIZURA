import {CanvasImage, HtmlInCanvas, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {blur} from '@remotion/effects/blur';
import {center, JizuraCut, JizuraScene, resolveScene, sliceGlitch, type JizuraCutProps} from 'remotion-jizura';

export type ImageEffectsProps = {
  target?: 'lyrics' | 'scene' | 'image';
  mode?: 'combined' | 'standard' | 'glitch' | 'disabled' | 'reverse';
  amount?: number;
  blurRadius?: number;
  offset?: number;
  fontSrc?: string;
};
export const imageSource = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#16324f"/><path d="M0 180H640M320 0V360" stroke="#fb7185" stroke-width="18"/><circle cx="320" cy="180" r="104" fill="#16f4d4" opacity=".65"/><path d="M100 280L320 45L540 280Z" fill="#fde047" opacity=".8"/><rect x="80" y="120" width="480" height="24" fill="#fff"/></svg>')}`;
const layout = center({seed: 30, params: {sx: 1, track: 0.08, sub: false, under: false, accent: false, ox: 0, oy: 0}});
export const imageEffectCuts: JizuraCutProps[] = [
  {text: '新しい*朝*が来た', from: 12, durationInFrames: 36, seed: 1234, layout, enter: null, exit: null, hold: null, decor: []},
  {text: '希望の*光*', from: 60, durationInFrames: 36, seed: 5678, layout, enter: null, exit: null, hold: null, decor: []},
];
// Effect triggers come from the same resolved Cut declarations as the lyrics.
// This sidecar is an example, not a new Cut.fx or serialized project API.
function useTrigger() {
  const frame = useCurrentFrame(), config = useVideoConfig();
  const snapshot = resolveScene({durationInFrames: 120}, config, imageEffectCuts);
  const cut = snapshot.cuts.find(c => frame >= c.from && frame < c.end);
  return {frame: cut ? frame - cut.from : 0, seed: cut?.seed ?? 0, active: !!cut, fps: config.fps};
}
function Layer({target = 'lyrics', mode = 'combined', amount = 0.65, blurRadius = 4, fontSrc = staticFile('NotoSansJP.ttf')}: ImageEffectsProps) {
  const {width, height} = useVideoConfig();
  const trigger = useTrigger();
  const standardDisabled = !trigger.active || mode === 'disabled' || mode === 'glitch';
  const glitchDisabled = !trigger.active || mode === 'disabled' || mode === 'standard';
  const scene = <JizuraScene width={width} height={height} durationInFrames={120} background={target === 'scene' ? '#16324F' : null}
    font={{family: 'Noto Sans JP', weight: 700, src: fontSrc}} style={{fontSize: height * 0.18}}>
    {imageEffectCuts.map((cut, index) => <JizuraCut key={index} {...cut} />)}
  </JizuraScene>;
  if (target === 'image' && mode === 'reverse') return <CanvasImage src={imageSource} width={width} height={height} style={{width, height}}
    effects={[
      sliceGlitch({amount, seed: trigger.seed, frame: trigger.frame, fps: trigger.fps, disabled: !trigger.active}),
      blur({radius: blurRadius, disabled: !trigger.active}),
    ]} />;
  if (target === 'image') return <CanvasImage src={imageSource} width={width} height={height} style={{width, height}}
    effects={[
      blur({radius: blurRadius, disabled: standardDisabled}),
      sliceGlitch({amount, displacement: 0.05, bands: 18, seed: trigger.seed, frame: trigger.frame, fps: trigger.fps, rate: 12, disabled: glitchDisabled}),
    ]} />;
  // Reverse is a dedicated experiment for order sensitivity, kept outside the
  // standard editor path so the ordinary effect array remains statically visible.
  if (mode === 'reverse') return <HtmlInCanvas width={width} height={height} pixelDensity={1}
    effects={[
      sliceGlitch({amount, seed: trigger.seed, frame: trigger.frame, fps: trigger.fps, disabled: !trigger.active}),
      blur({radius: blurRadius, disabled: !trigger.active}),
    ]}>{scene}</HtmlInCanvas>;
  return <HtmlInCanvas width={width} height={height} pixelDensity={1}
    effects={[
      blur({radius: blurRadius, disabled: standardDisabled}),
      sliceGlitch({amount, displacement: 0.05, bands: 18, seed: trigger.seed, frame: trigger.frame, fps: trigger.fps, rate: 12, disabled: glitchDisabled}),
    ]}>{scene}</HtmlInCanvas>;
}
export const ImageEffects = ({offset = 0, ...props}: ImageEffectsProps) =>
  <Sequence from={offset} durationInFrames={120}><Layer {...props} /></Sequence>;
