import type {JizuraCutProps, JizuraSceneProps} from './types.js';
import type {EffectGroup, EffectMetadata, ParameterValue, ResolvedFont, ResolvedStyle} from './custom-types.js';
import type {PreparedScene, ScenePlan} from './core/scene-plan.js';
import {prepareScene} from './core/scene-plan.js';
import type {Box, CutGeometry} from './canvas/geometry.js';
import {customRuntime} from './effects/custom.js';

export type EffectInspection = Readonly<{
  group: EffectGroup; id: string; seed: number; itemSeed: number;
  params: Readonly<Record<string, ParameterValue>>; explicitParams: readonly string[];
  layer?: 'back' | 'front'; metadata?: EffectMetadata;
}>;
export type CutInspection = Readonly<{
  declarationIndex: number; text: string; lineText: string;
  emphasis: readonly Readonly<{start: number; end: number}>[];
  from: number; end: number; durationInFrames: number;
  enterDurationInFrames: number; exitDurationInFrames: number; seed: number;
  font: ResolvedFont; style: ResolvedStyle;
  layout: EffectInspection; enter: EffectInspection | null; exit: EffectInspection | null;
  hold: EffectInspection | null; decor: readonly EffectInspection[];
  geometry?: Readonly<{box: Box | null; items: readonly Readonly<{
    x: number; y: number; size: number; track: number; sx: number; sy: number; glyphCount: number;
  }>[]}>;
}>;
export type SceneInspection = Readonly<{
  stage: 'prepared' | 'measured'; width: number; height: number; fps: number;
  durationInFrames: number; seed: number; motionFps: number | null; background: string | null;
  font: ResolvedFont; style: ResolvedStyle; cuts: readonly CutInspection[];
}>;
export function sceneInspection(scene: PreparedScene, plan?: ScenePlan<CutGeometry>): SceneInspection {
  const effect = (e: PreparedScene['cuts'][number]['enter']): EffectInspection | null => {
    if (!e) return null;
    const {customKey: _identity, ...data} = e;
    const metadata = customRuntime(e)?.metadata;
    return {...data, ...(metadata ? {metadata} : {})};
  };
  const data: SceneInspection = {stage: plan ? 'measured' : 'prepared', width: scene.width, height: scene.height,
    fps: scene.fps, durationInFrames: scene.durationInFrames, seed: scene.seed, motionFps: scene.motionFps,
    background: scene.background, font: scene.font, style: scene.style,
    cuts: scene.cuts.map((c, i) => {
      const geometry = plan?.cuts[i].geometry;
      return {declarationIndex: c.declarationIndex, text: c.text, lineText: c.lineText, emphasis: c.emphasis,
        from: c.from, end: c.end, durationInFrames: c.durationInFrames, seed: c.seed,
        enterDurationInFrames: c.enterDurationInFrames, exitDurationInFrames: c.exitDurationInFrames,
        font: c.font, style: c.style, layout: effect(c.layout)!, enter: effect(c.enter), exit: effect(c.exit), hold: effect(c.hold), decor: c.decor.map(e => effect(e)!),
        ...(geometry ? {geometry: {box: geometry.box, items: geometry.items.map(item => ({x: item.x, y: item.y, size: item.size, track: item.track,
          sx: item.sx, sy: item.sy, glyphCount: item.glyphs.length}))}} : {})};
    })};
  // A new detached JSON snapshot each time. Code/resources/private identity never escape.
  return JSON.parse(JSON.stringify(data)) as SceneInspection;
}
export function resolveScene(input: Omit<JizuraSceneProps, 'children' | 'onInspect'>,
  config: {width: number; height: number; fps: number}, cuts: readonly JizuraCutProps[]): SceneInspection {
  return sceneInspection(prepareScene(input, config, cuts));
}
