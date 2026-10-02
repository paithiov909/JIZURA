import type {FontSpec, JizuraStyle} from '../types.js';
import {color, fail, finite, freeze, keys, record} from './validation.js';

export type ResolvedFont = Readonly<Required<Pick<FontSpec, 'family' | 'weight' | 'style'>> & Pick<FontSpec, 'src'>>;
export type ResolvedStyle = Readonly<{
  palette: Readonly<Required<NonNullable<JizuraStyle['palette']>>>;
  fontSize?: number; track?: number; lead: number; emphasisColor: string;
}>;
export const DEFAULT_PALETTE = freeze({bg: '#111111', fg: '#FFFFFF', sub: '#B8B8B8', accent: '#F5A50C', accent2: '#16F4D4', ink: '#111111', dim: '#333333'});
export function resolveFont(value: unknown, path: string): ResolvedFont {
  if (value === undefined) return freeze({family: 'Noto Sans JP', weight: 700, style: 'normal'});
  const v = record(value, path, 'E_STYLE'); keys(v, ['family', 'weight', 'style', 'src'], path, 'E_STYLE');
  if (typeof v.family !== 'string' || !v.family.trim() || /[,"'\\\u0000-\u001F\u007F]/.test(v.family)) fail('E_STYLE', `${path}.family`, 'Expected a single font family.');
  const family = (v.family as string).trim(), weight = v.weight === undefined ? 700 : v.weight;
  if (!Number.isInteger(weight) || (weight as number) < 1 || (weight as number) > 1000) fail('E_STYLE', `${path}.weight`, 'Weight must be an integer in 1..1000.');
  const style = v.style === undefined ? 'normal' : v.style;
  if (style !== 'normal' && style !== 'italic') fail('E_STYLE', `${path}.style`, 'Expected normal or italic.');
  if (v.src !== undefined && (typeof v.src !== 'string' || !v.src.trim() || /[\u0000-\u001F\u007F]/.test(v.src))) fail('E_STYLE', `${path}.src`, 'Expected a nonempty URL.');
  return freeze({family, weight: weight as number, style, ...(v.src === undefined ? {} : {src: (v.src as string).trim()})});
}
function styleInput(value: unknown, path: string): JizuraStyle {
  if (value === undefined) return {};
  const v = record(value, path, 'E_STYLE');
  keys(v, ['palette', 'fontSize', 'track', 'lead', 'emphasisColor'], path, 'E_STYLE');
  const out: {palette?: Record<string, string>; fontSize?: number; track?: number; lead?: number; emphasisColor?: string} = {};
  if (v.palette !== undefined) {
    const p = record(v.palette, `${path}.palette`, 'E_STYLE'); keys(p, Object.keys(DEFAULT_PALETTE), `${path}.palette`, 'E_STYLE');
    out.palette = {};
    for (const [key, val] of Object.entries(p)) if (val !== undefined) out.palette[key] = color(val, `${path}.palette.${key}`);
  }
  for (const key of ['fontSize', 'track', 'lead'] as const) {
    if (v[key] === undefined) continue;
    const [min, max] = key === 'fontSize' ? [Number.MIN_VALUE, Infinity] : key === 'track' ? [0, 1] : [0.5, 4];
    out[key] = finite(v[key], `${path}.${key}`, min, max, 'E_STYLE');
  }
  if (v.emphasisColor !== undefined) out.emphasisColor = color(v.emphasisColor, `${path}.emphasisColor`);
  return out;
}
export function resolveStyle(scene: unknown, cut: unknown, path: string): ResolvedStyle {
  const a = styleInput(scene, 'style'), b = styleInput(cut, path);
  const palette = {...DEFAULT_PALETTE, ...a.palette, ...b.palette};
  return freeze({palette,
    ...((b.fontSize ?? a.fontSize) === undefined ? {} : {fontSize: b.fontSize ?? a.fontSize}),
    ...((b.track ?? a.track) === undefined ? {} : {track: b.track ?? a.track}),
    lead: b.lead ?? a.lead ?? 1.2, emphasisColor: b.emphasisColor ?? a.emphasisColor ?? palette.accent});
}
