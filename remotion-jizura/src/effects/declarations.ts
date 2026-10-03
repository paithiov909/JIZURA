import type {
  CenterParams, DecorParams, EffectOptions, NoParams, CenterEffect, PopEffect,
  WipeEffect, DriftEffect, BreatheEffect, KasumiEffect, CheckerStripEffect,
  MixedParams, MixedEffect, SlideLeftEffect, ShrinkEffect, JitterParams, JitterEffect, BracketsParams, BracketsEffect,
} from '../types.js';
import {batchSchemas} from './batch-schema.js';
import {customRuntime, attachCustom, customParams} from './custom.js';
import {fail, freeze, keys, record, seed} from '../core/validation.js';
import {effectSeed, itemSeed, parameterSeed, rng, selectionSeed} from '../core/random.js';

export type Group = 'layout' | 'enter' | 'exit' | 'hold' | 'decor';
type ParamValue = number | boolean | string;
export type Declaration = Readonly<{group: Group; id: string; seed?: number; params?: Readonly<Record<string, ParamValue>>}>;
export type ResolvedEffect = Readonly<{
  group: Group; id: string; seed: number; itemSeed: number;
  params: Readonly<Record<string, ParamValue>>; explicitParams: readonly string[];
  layer?: 'back' | 'front'; customKey?: number;
}>;
// Supported text/decor IDs are implemented by center/mixed, motion and decor.
// Candidate order/weights remain the API v1 equal-probability selection.
export const CANDIDATES = freeze({layout: ['center'], enter: ['pop', 'wipe'], exit: ['drift'], hold: ['breathe'], decor: ['kasumi', 'checkerStrip']});
// Accepted IDs are separate from the unchanged automatic candidate list.
export const SUPPORTED = freeze({layout: ['center', 'mixed'], enter: ['pop', 'wipe', 'slideLeft'], exit: ['drift', 'shrink'], hold: ['breathe', 'jitter'], decor: ['kasumi', 'checkerStrip', 'brackets']});
function params(value: unknown, group: Group, path: string, id: string): Record<string, ParamValue> | undefined {
  if (value === undefined) return undefined;
  const schema = batchSchemas[id];
  if (schema) return customParams(value, schema, path);
  const v = record(value, path, 'E_EFFECT');
  const bounds: Record<string, readonly [number, number, boolean?]> = group === 'layout'
    ? {sx: [0.25, 4], track: [0, 1], ox: [-0.25, 0.25], oy: [-0.25, 0.25]}
    : group === 'decor' ? {n: [1, 3, true], from: [0, 20, true], to: [30, 999, true], v: [0, 5, true], r: [0, 1]} : {};
  const booleans = group === 'layout' ? ['sub', 'under', 'accent'] : group === 'decor' ? ['right', 'low', 'accent', 'corner', 'big'] : [];
  keys(v, [...Object.keys(bounds), ...booleans, ...(group === 'decor' ? ['mode'] : [])], path, 'E_EFFECT');
  const out: Record<string, ParamValue> = {};
  for (const [key, val] of Object.entries(v)) {
    if (val === undefined) continue;
    if (bounds[key]) {
      const [lo, hi, whole] = bounds[key];
      if (typeof val !== 'number' || !Number.isFinite(val) || val < lo || val > hi ||
          (key === 'r' && val === 1) || (whole && !Number.isInteger(val))) fail('E_EFFECT', `${path}.${key}`, 'Invalid numeric parameter.');
    } else if (booleans.includes(key)) {
      if (typeof val !== 'boolean') fail('E_EFFECT', `${path}.${key}`, 'Expected boolean.');
    } else if (val !== 'count' && val !== 'index') fail('E_EFFECT', `${path}.${key}`, 'Expected count or index.');
    out[key] = val as ParamValue;
  }
  return out;
}
export function validateDeclaration(value: unknown, group: Group, path: string): Declaration {
  const v = typeof value === 'string' ? {group, id: value} : record(value, path, 'E_EFFECT');
  keys(v, ['group', 'id', 'seed', 'params'], path, 'E_EFFECT');
  const custom = customRuntime(v);
  if (v.group !== group || typeof v.id !== 'string' || (!custom && !SUPPORTED[group].includes(v.id)) ||
      (custom && (custom.metadata.group !== group || custom.metadata.id !== v.id || SUPPORTED[group].includes(v.id)))) fail('E_EFFECT', path, 'Unsupported effect ID or group.');
  const p = custom ? customParams(v.params, custom.metadata.schema, `${path}.params`) : params(v.params, group, `${path}.params`, v.id as string);
  const declaration = freeze({group, id: v.id as string,
    ...(v.seed === undefined ? {} : {seed: seed(v.seed, `${path}.seed`)}),
    ...(p === undefined ? {} : {params: p})});
  if (custom) attachCustom(declaration, custom);
  return declaration;
}
function factory(group: Group, id: string, options: unknown): Declaration {
  const o = options === undefined ? {} : record(options, id, 'E_EFFECT');
  keys(o, ['seed', 'params'], id, 'E_EFFECT');
  return validateDeclaration({group, id, ...o}, group, id);
}
export function center(o?: EffectOptions<CenterParams>): CenterEffect { return factory('layout', 'center', o) as CenterEffect; }
export function pop(o?: EffectOptions<NoParams>): PopEffect { return factory('enter', 'pop', o) as PopEffect; }
export function wipe(o?: EffectOptions<NoParams>): WipeEffect { return factory('enter', 'wipe', o) as WipeEffect; }
export function drift(o?: EffectOptions<NoParams>): DriftEffect { return factory('exit', 'drift', o) as DriftEffect; }
export function breathe(o?: EffectOptions<NoParams>): BreatheEffect { return factory('hold', 'breathe', o) as BreatheEffect; }
export function kasumi(o?: EffectOptions<DecorParams>): KasumiEffect { return factory('decor', 'kasumi', o) as KasumiEffect; }
export function checkerStrip(o?: EffectOptions<DecorParams>): CheckerStripEffect { return factory('decor', 'checkerStrip', o) as CheckerStripEffect; }
export function mixed(o?: EffectOptions<MixedParams>): MixedEffect {return factory('layout', 'mixed', o) as MixedEffect;}
export function slideLeft(o?: EffectOptions<NoParams>): SlideLeftEffect {return factory('enter', 'slideLeft', o) as SlideLeftEffect;}
export function shrink(o?: EffectOptions<NoParams>): ShrinkEffect {return factory('exit', 'shrink', o) as ShrinkEffect;}
export function jitter(o?: EffectOptions<JitterParams>): JitterEffect {return factory('hold', 'jitter', o) as JitterEffect;}
export function brackets(o?: EffectOptions<BracketsParams>): BracketsEffect {return factory('decor', 'brackets', o) as BracketsEffect;}
function generatedParams(group: Group, effect: number, id: string): Record<string, ParamValue> {
  const r = rng(parameterSeed(effect));
  if (id === 'mixed') {r.pick([0]); r.pick([0]); return {mode: r.pick(['line', 'stair', 'line', 'wave']), rotAmp: r.range(2, 10), smallK: r.range(0.42, 0.6), accentIdx: r.int(0, 20)};}
  if (id === 'jitter') return {amount: 1};
  if (id === 'brackets') return {pad: 18, stroke: 2.2, accent: false};
  if (group === 'layout') {
    r.chance(0.7); r.pick([0]); // old center font role choice, now one resolved face
    return {sx: r.pick([1, 1, 1, 1.25, 1.45, 0.78]), track: r.range(0.02, 0.14),
      sub: r.chance(0.45), under: r.chance(0.3), accent: r.chance(0.18), ox: r.range(-0.05, 0.05), oy: r.range(-0.06, 0.06)};
  }
  if (group === 'decor') {
    r.int(1, 1e9); // old decorParams seed draw: preserve consumption, use derived seed
    return {n: r.int(1, 3), right: r.chance(0.5), low: r.chance(0.5), accent: r.chance(0.4),
      corner: r.chance(0.5), big: r.chance(0.4), mode: r.pick(['count', 'index']),
      from: r.int(0, 20), to: r.int(30, 999), v: r.int(0, 5), r: r()};
  }
  return {};
}
export function resolveEffect(value: unknown, group: Group, cut: number, path: string, slot = 0): ResolvedEffect | null {
  if (value === null && group !== 'layout' && group !== 'decor') return null;
  const declaration = validateDeclaration(value === undefined ? rng(selectionSeed(cut, group)).pick(CANDIDATES[group]) : value, group, path);
  const s = declaration.seed ?? effectSeed(cut, group, declaration.id, slot);
  const custom = customRuntime(declaration);
  const effect = freeze({group, id: declaration.id, seed: s, itemSeed: itemSeed(s, 0),
    ...(custom ? {customKey: custom.key} : {}),
    params: custom ? customParams(declaration.params, custom.metadata.schema, `${path}.params`, true) : {...generatedParams(group, s, declaration.id), ...declaration.params}, explicitParams: Object.keys(declaration.params ?? {}),
    ...(group === 'decor' ? {layer: custom?.metadata.layer ?? (declaration.id === 'kasumi' ? 'back' as const : 'front' as const)} : {})});
  if (custom) attachCustom(effect, custom);
  return effect;
}
