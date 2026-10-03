import type {JizuraCutProps, JizuraSceneProps} from '../types.js';
import {resolveEffect, type ResolvedEffect} from '../effects/declarations.js';
import {customRuntime} from '../effects/custom.js';
import {cutSeed} from './random.js';
import {resolveFont, resolveStyle, type ResolvedFont, type ResolvedStyle} from './style.js';
import {resolveText, type CutText} from './text.js';
import {phaseTiming, placeCuts, type Placement} from './timing.js';
import {color, fail, finite, freeze, integer, keys, record, seed} from './validation.js';

export type PreparedCut = Readonly<Placement & CutText & {
  seed: number; font: ResolvedFont; style: ResolvedStyle;
  layout: ResolvedEffect; enter: ResolvedEffect | null; exit: ResolvedEffect | null; hold: ResolvedEffect | null;
  decor: readonly ResolvedEffect[];
  trackSource: 'params' | 'style' | 'auto';
  enterDurationInFrames: number; exitDurationInFrames: number;
}>;
export type PreparedScene = Readonly<{
  width: number; height: number; fps: number; durationInFrames: number; seed: number;
  font: ResolvedFont; style: ResolvedStyle; background: string | null; motionFps: number | null;
  cuts: readonly PreparedCut[];
}>;
const CUT_KEYS = ['text', 'seed', 'from', 'durationInFrames', 'enterDurationInFrames', 'exitDurationInFrames',
  'layout', 'enter', 'exit', 'hold', 'decor', 'treat', 'bg', 'cam', 'fx', 'trans', 'font', 'style'];
export function prepareScene(
  input: Omit<JizuraSceneProps, 'children' | 'onInspect'>,
  config: {width: number; height: number; fps: number},
  declarationsOrCollect: readonly JizuraCutProps[] | (() => readonly JizuraCutProps[]),
): PreparedScene {
  const props = record(input, 'scene');
  keys(props, ['durationInFrames', 'width', 'height', 'seed', 'font', 'style', 'background', 'motionFps'], '');
  const durationInFrames = integer(props.durationInFrames, 'durationInFrames', 1);
  const width = integer(props.width === undefined ? config.width : props.width, 'width', 1);
  const height = integer(props.height === undefined ? config.height : props.height, 'height', 1);
  const fps = finite(config.fps, 'fps', Number.MIN_VALUE);
  const sceneSeed = seed(props.seed === undefined ? 20260922 : props.seed, 'seed');
  const font = resolveFont(props.font, 'font'), style = resolveStyle(props.style, undefined, 'style');
  const background = props.background === undefined ? style.palette.bg : props.background === null ? null : color(props.background, 'background');
  const motionFps = props.motionFps === undefined || props.motionFps === null ? null : finite(props.motionFps, 'motionFps', Number.MIN_VALUE, fps);
  const declarations = typeof declarationsOrCollect === 'function' ? declarationsOrCollect() : declarationsOrCollect;
  if (!Array.isArray(declarations) || declarations.length > 1000) fail('E_INPUT', 'cuts', 'Expected at most 1000 Cut declarations.');
  // Validate in declaration order before the time collection is sorted/checked.
  let inputCodePoints = 0;
  const definitions = new Map<string, number>();
  const checkDefinition = (effect: ResolvedEffect | null, path: string) => {
    if (!effect) return;
    const runtime = customRuntime(effect); if (!runtime) return;
    const key = `${effect.group}:${effect.id}`, previous = definitions.get(key);
    if (previous !== undefined && previous !== runtime.key) fail('E_EFFECT', path, 'Different definitions use the same group and ID in this Scene.');
    definitions.set(key, runtime.key);
  };
  const resolved = Array.from(declarations, (c, i) => {
    const path = `cuts[${i}]`;
    keys(record(c, path), CUT_KEYS, path);
    const text = resolveText(c.text, `${path}.text`);
    inputCodePoints += [...(typeof c.text === 'string' ? c.text : c.text.text)].length;
    if (inputCodePoints > 100000) fail('E_INPUT', 'cuts', 'Scene text exceeds the code point limit.');
    for (const key of ['from', 'durationInFrames', 'enterDurationInFrames', 'exitDurationInFrames'] as const) {
      if (c[key] !== undefined) integer(c[key], `${path}.${key}`, key === 'durationInFrames' ? 1 : 0);
    }
    const s = c.seed === undefined ? cutSeed(sceneSeed, i) : seed(c.seed, `${path}.seed`);
    const cutFont = c.font === undefined ? font : resolveFont(c.font, `${path}.font`);
    const cutStyle = resolveStyle(props.style, c.style, `${path}.style`);
    const layout = resolveEffect(c.layout, 'layout', s, `${path}.layout`)!;
    const trackSource = layout.id === 'center' && layout.customKey === undefined && layout.explicitParams.includes('track') ? 'params' as const : layout.id === 'center' && layout.customKey === undefined && cutStyle.track !== undefined ? 'style' as const : 'auto' as const;
    const resolvedLayout = trackSource === 'style' ? freeze({...layout, params: {...layout.params, track: cutStyle.track!}}) : layout;
    const enter = resolveEffect(c.enter, 'enter', s, `${path}.enter`);
    const exit = resolveEffect(c.exit, 'exit', s, `${path}.exit`);
    const hold = resolveEffect(c.hold, 'hold', s, `${path}.hold`);
    if (c.decor !== undefined && (!Array.isArray(c.decor) || c.decor.length > 16)) fail('E_EFFECT', `${path}.decor`, 'Expected an array of at most 16 effects.');
    const decor = c.decor === undefined ? [resolveEffect(undefined, 'decor', s, `${path}.decor[0]`)!]
      : Array.from(c.decor, (value: unknown, slot: number) => {
        if (value === undefined) fail('E_EFFECT', `${path}.decor[${slot}]`, 'Decor entries must be IDs or declarations.');
        return resolveEffect(value, 'decor', s, `${path}.decor[${slot}]`, slot)!;
      });
    for (const [group, effect] of Object.entries({layout: resolvedLayout, enter, exit, hold})) checkDefinition(effect, `${path}.${group}`);
    decor.forEach((effect, slot) => checkDefinition(effect, `${path}.decor[${slot}]`));
    for (const g of ['treat', 'bg', 'cam', 'fx', 'trans'] as const) {
      if (c[g] !== undefined && c[g] !== null) fail('E_EFFECT', `${path}.${g}`, 'This group only supports null.');
    }
    return {declarationIndex: i, ...text, seed: s, font: cutFont, style: cutStyle, layout: resolvedLayout, enter, exit, hold, decor, trackSource};
  });
  const cuts = placeCuts(declarations, durationInFrames).map(placement => {
    const i = placement.declarationIndex, cut = resolved[i];
    return freeze({...cut, ...placement,
      ...phaseTiming(declarations[i], placement.durationInFrames, fps, cut.enter !== null, cut.exit !== null, `cuts[${i}]`)});
  });
  return freeze({width, height, fps, durationInFrames, seed: sceneSeed, font, style, background, motionFps, cuts});
}

// Measurement services return owned, serializable geometry (glyphs/items/boxes).
// No DOM, React nodes, mutable caches or drawing callbacks belong in the plan.
export type PlanData = null | boolean | number | string | readonly PlanData[] | {readonly [key: string]: PlanData};
export interface MeasurementService<T> {
  prepareFonts(scene: PreparedScene): void | Promise<void>;
  measureCut(cut: PreparedCut, scene: PreparedScene): T | Promise<T>;
}
export type DeepReadonly<T> = T extends object ? {readonly [K in keyof T]: DeepReadonly<T[K]>} : T;
export type ScenePlan<T> = Readonly<{
  prepared: PreparedScene;
  cuts: readonly Readonly<{prepared: PreparedCut; geometry: DeepReadonly<T>}>[];
}>;
function copyGeometry(value: unknown, path: string, ancestors = new Set<object>()): PlanData {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return finite(value, path, -Infinity);
  if (value !== null && typeof value === 'object') {
    if (ancestors.has(value)) fail('E_INPUT', path, 'Geometry must not contain cycles.');
    ancestors.add(value);
  }
  if (Array.isArray(value)) {
    const out = Array.from(value, (v, i) => copyGeometry(v, `${path}[${i}]`, ancestors));
    ancestors.delete(value); return out;
  }
  const obj = record(value, path), out: Record<string, PlanData> = {};
  for (const key of Reflect.ownKeys(obj)) {
    if (typeof key !== 'string') fail('E_INPUT', path, 'Geometry keys must be strings.');
    Object.defineProperty(out, key, {value: copyGeometry(obj[key], `${path}.${key}`, ancestors), enumerable: true});
  }
  ancestors.delete(obj); return out;
}
export async function finalizeScene<T>(prepared: PreparedScene, service: MeasurementService<T>): Promise<ScenePlan<T>> {
  // The service must verify the exact face/load, rather than accepting fallback.
  await service.prepareFonts(prepared);
  const cuts = [];
  for (const cut of prepared.cuts) {
    const geometry = copyGeometry(await service.measureCut(cut, prepared), `cuts[${cut.declarationIndex}].geometry`) as DeepReadonly<T>;
    cuts.push({prepared: cut, geometry});
  }
  return freeze({prepared, cuts});
}
