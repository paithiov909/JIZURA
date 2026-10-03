import {JizuraScene, JizuraCut, center, pop, drift, resolveScene, type JizuraCutProps, type SceneInspection} from 'remotion-jizura';
import {staticFile} from 'remotion';
import {offsetLines, glyphWave, boxRule} from './effects.tsx';

export const customConfig = {width: 640, height: 360, fps: 24};
export const customScene = () => ({width: customConfig.width, height: customConfig.height, durationInFrames: 120, seed: 20260922,
  font: {family: 'Noto Sans JP', weight: 700, src: staticFile('NotoSansJP.ttf')}});
export function customCuts(amplitude = 12): readonly JizuraCutProps[] {
  return [
    {text: '新しい*朝*が来た', seed: 1234, from: 0, durationInFrames: 60, enterDurationInFrames: 12, exitDurationInFrames: 16,
      layout: offsetLines({seed: 100, params: {offset: -0.06}}), enter: pop({seed: 200}), exit: drift({seed: 300}),
      hold: glyphWave({seed: 400, params: {amplitude, cycles: 0.8}}), decor: [boxRule({seed: 500, params: {thickness: 4, accent: true}})]},
    {text: '変えない参照', seed: 5678, from: 60, durationInFrames: 60, layout: center({seed: 600, params: {
      sx: 1, track: 0.06, sub: false, under: false, accent: false, ox: 0, oy: 0,
    }}), enter: null, exit: null, hold: null, decor: []},
  ];
}
export function inspectCustom(amplitude = 12) {
  return resolveScene(customScene(), customConfig, customCuts(amplitude));
}
export function CustomEffects({amplitude = 12, onInspect}: {amplitude?: number; onInspect?: (inspection: SceneInspection) => void}) {
  return <JizuraScene {...customScene()} onInspect={onInspect}>
    {customCuts(amplitude).map((cut, i) => <JizuraCut key={i} {...cut} />)}
  </JizuraScene>;
}
