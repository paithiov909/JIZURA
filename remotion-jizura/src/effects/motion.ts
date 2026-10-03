import {itemSeed} from '../core/random.js';
import type {PreparedCut} from '../core/scene-plan.js';
import type {FrameState} from '../core/frame.js';
import type {FrameItem} from '../canvas/frame.js';
import {E, clamp, lerp, rs, r, TAU, DEG} from './math.js';
export type CharTransform = {hide?: boolean; s?: number; rot?: number; dx?: number; dy?: number; a?: number};
export type PieceTransform = {dx: number; dy: number; rot: number; s: number; st: number; sdir: number; a: number};
export const PID: PieceTransform = Object.freeze({dx: 0, dy: 0, rot: 0, s: 1, st: 1, sdir: 0, a: 1});
export function popChar(seed: number, i: number, n: number, p: number): CharTransform {
  const d = n > 1 ? i / (n - 1) * 0.45 : 0, q = clamp((p - d) / 0.55);
  return q <= 0 ? {hide: true} : {s: E.outBack(q, 2.6), rot: (1 - E.outCubic(q)) * rs(seed | 0, i, 9) * 28};
}
export function slideLeftChar(i: number, n: number, p: number, size: number): CharTransform {
  const d = n > 1 ? i / (n - 1) * 0.5 : 0, q = clamp((p - d) / 0.5);
  return q <= 0 ? {hide: true} : q >= 1 ? {} : {dx: -0.85 * size * (1 - E.outQuint(q)), a: Math.pow(clamp(q * 1.6), 1.6)};
}
export function jitterChar(seed: number, step: number, i: number, size: number, amt: number, amount: number): CharTransform {
  const a = size * 0.025 * amt * amount;
  return a < 0.2 ? {} : {dx: rs(seed | 0, step, i, 1) * a, dy: rs(seed | 0, step, i, 2) * a, rot: rs(seed | 0, step, i, 3) * 4 * amt};
}
export function driftPiece(seed: number, ci: number, pj: number, size: number, elapsed: number, dur: number): PieceTransform | null {
  seed |= 0;
  const x = (elapsed - r(seed, ci, pj, 31) * dur * 0.3) / (dur * 0.7);
  if (x <= 0) return PID;
  if (x >= 1) return null;
  const e = E.inQuad(x), ang = r(seed, ci, pj, 32) * TAU, dd = size * 1.6 * (0.3 + 0.7 * r(seed, ci, pj, 33));
  return {dx: Math.cos(ang) * dd * e, dy: Math.sin(ang) * dd * e - size * 0.3 * e,
    rot: rs(seed, ci, pj, 34) * 80 * e, s: 1 - 0.35 * e, st: 1 + e * 0.8, sdir: ang / DEG, a: 1 - e * e};
}
export type ItemMotion = {chars: CharTransform[]; clip?: [number, number]; bar?: {x: number; h: number}; driftSeed?: number};
export function applyMotion(item: FrameItem, cut: PreparedCut, state: FrameState): ItemMotion {
  const motion: ItemMotion = {chars: []};
  const seedFor = (effect: NonNullable<PreparedCut['hold']>) => itemSeed(effect.seed, item.index ?? 0);
  const combine = (next: CharTransform, i: number) => {
    const prev = motion.chars[i] ?? {};
    motion.chars[i] = {...prev, dx: (prev.dx ?? 0) + (next.dx ?? 0), dy: (prev.dy ?? 0) + (next.dy ?? 0), rot: (prev.rot ?? 0) + (next.rot ?? 0), a: (prev.a ?? 1) * (next.a ?? 1)};
  };
  // Enter measures BEFORE breathe, as mainDraw does; glyphs are then re-laid out.
  if (state.applyEnter && cut.enter?.id === 'pop') motion.chars = item.glyphs.map(g => popChar(seedFor(cut.enter!), g.i, item.glyphs.length, state.pIn));
  if (state.applyEnter && cut.enter?.id === 'slideLeft') motion.chars = item.glyphs.map(g => slideLeftChar(g.i, item.glyphs.length, state.pIn, item.size));
  if (state.applyEnter && cut.enter?.id === 'wipe') {
    const width = Math.max(1, ...item.text.split('\n').map((_, li) => item.glyphs.filter(g => g.li === li).reduce((s, g, i, line) => s + g.w + (i < line.length - 1 ? item.track * item.size : 0), 0))) * item.sx;
    const height = item.text.split('\n').length * item.lead * item.size - (item.lead * item.size - item.size);
    const x0 = item.x - width / 2 - item.size * 0.2, x1 = item.x + width / 2 + item.size * 0.2;
    const dir = (seedFor(cut.enter!) | 0) % 2 ? 1 : -1, e = E.inOutExpo(state.pIn);
    const edge = dir > 0 ? lerp(x0, x1, e) : lerp(x1, x0, e);
    motion.clip = dir > 0 ? [x0 - 4000, edge] : [edge, x1 + 4000];
    motion.bar = {x: edge, h: height * 1.3 + item.size * 0.2};
  }
  if (state.applyHold && cut.hold?.id === 'breathe') {
    item.size *= 1 + 0.035 * Math.sin(state.evaluationSeconds! * TAU * 0.9) * state.holdAmount;
    item.track = (item.track || 0) + 0.03 * Math.sin(state.evaluationSeconds! * TAU * 0.6) * state.holdAmount;
  }
  if (state.applyHold && cut.hold?.id === 'jitter') item.glyphs.forEach((g, i) => combine(jitterChar(seedFor(cut.hold!), state.step, g.i, item.size, state.holdAmount, cut.hold!.params.amount as number), i));
  if (state.applyExit && cut.exit?.id === 'shrink') {
    const e = E.inCubic(state.pOut);
    item.size *= 1 - e * 0.96; item.track -= e * 0.2;
    item.glyphs.forEach((_, i) => combine({a: 1 - e * e}, i));
  }
  if (state.applyExit && cut.exit?.id === 'drift') motion.driftSeed = seedFor(cut.exit);
  return motion;
}
