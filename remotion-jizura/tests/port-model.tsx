import React from 'react';
import {CanvasImage, HtmlInCanvas, staticFile, useCurrentFrame} from 'remotion';
import {blur} from '@remotion/effects/blur';
import {JizuraScene, JizuraCut, center, pop, wipe, drift, breathe, kasumi, checkerStrip, sliceGlitch,
  type JizuraCutProps, type JizuraSceneProps} from 'remotion-jizura';
import {offsetLines, glyphWave, boxRule} from '../examples/custom/effects.tsx';
import {imageSource} from '../examples/image-effects/ImageEffects.tsx';
import {getPortCase, sceneDuration, type PortCase} from './port-cases.ts';

export type PortInput = {caseId: string; edit?: boolean; fontSrc?: string};
export function portInputs(spec: PortCase, edit = false, fontSrc = '/NotoSansJP.ttf') {
  const scene: Omit<JizuraSceneProps, 'children'> = {width: spec.width, height: spec.height,
    durationInFrames: sceneDuration(spec), seed: spec.seed, background: spec.background, motionFps: spec.motionFps,
    font: {family: 'Noto Sans JP', weight: 700, style: 'normal', src: fontSrc}, style: {fontSize: 64}};
  const cut: {-readonly [K in keyof JizuraCutProps]: JizuraCutProps[K]} = {text: spec.text, from: spec.from, durationInFrames: spec.duration,
    enterDurationInFrames: spec.enter, exitDurationInFrames: spec.exit, seed: spec.seed,
    layout: center({seed: spec.seed, params: {sx: 1, track: 0.08, ox: 0, oy: 0, sub: false, under: false, accent: false,
      ...spec.layout, ...(edit ? {ox: spec.layout?.ox === 0.12 ? -0.12 : 0.12} : {})}}), enter: null, exit: null, hold: null, decor: []};
  const p = spec.preset;
  if (p === 'pop' || p === 'combined') cut.enter = pop({seed: spec.seed});
  if (p === 'wipe') cut.enter = wipe({seed: spec.seed});
  if (p === 'drift' || p === 'combined') cut.exit = drift({seed: spec.seed});
  if (p === 'breathe' || p === 'combined') cut.hold = breathe({seed: spec.seed});
  if (p === 'kasumi' || p === 'combined') cut.decor = [kasumi({seed: spec.seed, params: {n: 2, right: false, ...spec.decor}})];
  if (p === 'checker' || p === 'combined') cut.decor = [...cut.decor!, checkerStrip({seed: spec.seed, params: {v: 2, right: false, low: true, accent: true, ...spec.decor}})];
  if (p === 'custom') {
    const opts = spec.custom!;
    cut.layout = offsetLines({seed: spec.seed, params: {offset: edit ? (opts.offset === 0.1 ? -0.1 : 0.1) : opts.offset}});
    cut.enter = pop({seed: spec.seed}); cut.exit = drift({seed: spec.seed});
    cut.hold = glyphWave({seed: spec.seed, params: {amplitude: opts.amplitude, cycles: opts.cycles}});
    cut.decor = [boxRule({seed: spec.seed, params: {thickness: opts.thickness, accent: opts.accent}})];
  }
  return {scene, cut, config: {width: spec.width, height: spec.height, fps: spec.fps}};
}
export function imageParameters(spec: PortCase, frame: number, edit = false) {
  const active = frame >= spec.from && frame < spec.from + spec.duration, im = spec.image!;
  return {active, target: im.target, mode: im.mode,
    slice: {amount: edit ? (im.amount === 0 ? 1 : 0) : im.amount, displacement: 0.05, bands: 18, seed: spec.seed,
      frame: active ? frame - spec.from : 0, fps: spec.fps, rate: 12, disabled: !active || im.mode === 'standard'},
    blur: {radius: edit ? (im.radius === 0 ? 4 : 0) : im.radius, disabled: !active || im.mode === 'glitch'}};
}
export function PortScene({caseId, edit = false, fontSrc = staticFile('NotoSansJP.ttf')}: PortInput) {
  const spec = getPortCase(caseId), frame = useCurrentFrame();
  const {scene, cut} = portInputs(spec, spec.kind === 'text' && edit, fontSrc);
  const content = <JizuraScene {...scene}><JizuraCut {...cut} /></JizuraScene>;
  if (spec.kind === 'text') return content;
  const params = imageParameters(spec, frame, edit);
  const effects = params.mode === 'reverse'
    ? [sliceGlitch(params.slice), blur(params.blur)] : [blur(params.blur), sliceGlitch(params.slice)];
  if (params.target === 'image') return <CanvasImage src={imageSource} width={spec.width} height={spec.height} effects={effects} />;
  return <HtmlInCanvas width={spec.width} height={spec.height} pixelDensity={1} effects={effects}>{content}</HtmlInCanvas>;
}
