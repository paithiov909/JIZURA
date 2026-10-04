import {useMemo} from 'react';
import {HtmlInCanvas, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {blur} from '@remotion/effects/blur';
import {JizuraScene, JizuraCut, resolveScene, sliceGlitch, type SceneInspection} from 'remotion-jizura';
import {buildLoopCuts, loopVariants, validateLoopInput, type LoopInput} from './model.tsx';

export type LoopProps = {candidate?: string; input?: LoopInput; fontSrc?: string; fontPreloaded?: boolean; onInspect?: (value: SceneInspection) => void};
export const ReviewLoop = ({candidate = 'original', input, fontSrc = staticFile('NotoSansJP.ttf'), fontPreloaded = false, onInspect}: LoopProps) => {
  const config = useVideoConfig(), frame = useCurrentFrame();
  const model = useMemo(() => validateLoopInput(input ?? loopVariants[candidate], config), [input, candidate, config.width, config.height, config.fps]);
  const cuts = useMemo(() => buildLoopCuts(model), [model]);
  // Scale design font size for high-resolution/portrait representatives. Exact
  // dimensions and resolved style are recorded with every artifact.
  const sceneProps = useMemo(() => ({...model.scene, background: null,
    font: {...model.scene.font!, ...(fontPreloaded ? {} : {src: fontSrc})},
    style: {...model.scene.style, fontSize: model.scene.style!.fontSize! * Math.min(config.width / 640, config.height / 360)}}), [model, fontSrc, fontPreloaded, config.width, config.height]);
  const snapshot = useMemo(() => resolveScene(sceneProps, config, cuts), [sceneProps, cuts, config.width, config.height, config.fps]);
  const index = model.cuts.findIndex(c => c.id === model.image.cutId);
  const cut = snapshot.cuts.find(c => c.declarationIndex === index)!;
  const local = frame - cut.from, im = model.image;
  const active = local >= im.fromLocal && local < im.toLocal;
  const lyricsOnly = active && im.target === 'lyrics';
  const scene = <JizuraScene {...sceneProps} onInspect={onInspect}>{cuts.map((props, i) => <JizuraCut key={model.cuts[i].id} {...props} />)}</JizuraScene>;
  const motif = <div style={{position: 'absolute', inset: '8%', pointerEvents: 'none', borderLeft: '3px solid #375362', borderRight: '3px solid #375362'}} />;
  return <div data-review-loop="true" style={{position: 'relative', width: config.width, height: config.height, background: model.scene.background ?? undefined}}>
    {lyricsOnly && motif}
    <HtmlInCanvas width={config.width} height={config.height} pixelDensity={1} effects={[
      blur({radius: im.blurRadius, disabled: !active}),
      sliceGlitch({amount: im.amount, displacement: im.displacement, bands: im.bands, rate: im.rate,
        seed: im.seed, frame: Math.max(0, local), fps: config.fps, disabled: !active}),
    ]}><div style={{position: 'relative', width: config.width, height: config.height, background: lyricsOnly ? undefined : model.scene.background ?? undefined}}>{scene}{!lyricsOnly && motif}</div></HtmlInCanvas>
  </div>;
};
