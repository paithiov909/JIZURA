import type {JizuraCutProps} from '../types.js';
import {fail, integer} from './validation.js';
export type Placement = Readonly<{declarationIndex: number; from: number; durationInFrames: number; end: number}>;
const safeSum = (a: number, b: number, path: string) => integer(a + b, path);
export function placeCuts(cuts: readonly JizuraCutProps[], duration: number): Placement[] {
  const explicit = cuts.some(c => c.from !== undefined);
  const durations = cuts.map((c, i) => c.durationInFrames === undefined ? undefined : integer(c.durationInFrames, `cuts[${i}].durationInFrames`, 1));
  if (explicit) {
    const placed = cuts.map((c, i) => {
      if (c.from === undefined || durations[i] === undefined) return fail('E_TIMING', `cuts[${i}]`, 'Explicit mode requires from and duration for every Cut.');
      const from = integer(c.from, `cuts[${i}].from`), d = durations[i]!;
      const end = safeSum(from, d, `cuts[${i}].end`);
      if (end > duration) fail('E_TIMING', `cuts[${i}]`, 'Cut is outside the Scene.');
      return {declarationIndex: i, from, durationInFrames: d, end};
    }).sort((a, b) => a.from - b.from || a.declarationIndex - b.declarationIndex);
    for (let i = 1; i < placed.length; i++) if (placed[i].from < placed[i - 1].end) fail('E_TIMING', `cuts[${placed[i].declarationIndex}]`, 'Cuts overlap.');
    return placed;
  }
  const fixed = durations.reduce<number>((n, d, i) => safeSum(n, d ?? 0, `cuts[${i}].durationInFrames`), 0);
  const count = durations.filter(d => d === undefined).length, rest = duration - fixed;
  if (rest < count) fail('E_TIMING', 'cuts', 'Insufficient Scene duration.');
  const base = count ? Math.floor(rest / count) : 0; let remainder = count ? rest % count : 0, from = 0;
  return cuts.map((_, i) => {
    const d = durations[i] ?? (base + (remainder-- > 0 ? 1 : 0));
    const p = {declarationIndex: i, from, durationInFrames: d, end: safeSum(from, d, `cuts[${i}].end`)};
    from = p.end; return p;
  });
}
export function phaseTiming(cut: JizuraCutProps, duration: number, fps: number, enter: boolean, exit: boolean, path: string) {
  const explicit = [cut.enterDurationInFrames, cut.exitDurationInFrames];
  const enabled = [enter, exit], names = ['enterDurationInFrames', 'exitDurationInFrames'];
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const candidates = [Math.max(1, Math.round(clamp(duration / fps * 0.36, 0.12, 0.6) * fps)),
    Math.max(1, Math.round(clamp(duration / fps * 0.38, 0.25, 0.7) * fps))];
  const frames = explicit.map((v, i) => v === undefined ? (enabled[i] ? candidates[i] : 0) : integer(v, `${path}.${names[i]}`));
  explicit.forEach((v, i) => { if (!enabled[i] && v !== undefined && v !== 0) fail('E_TIMING', `${path}.${names[i]}`, 'Disabled effect must have zero duration.'); });
  const fixed = frames.reduce((n, f, i) => safeSum(n, explicit[i] === undefined ? 0 : f, path), 0), budget = duration - 1;
  if (fixed > budget) fail('E_TIMING', path, 'Explicit phase durations exceed D-1.');
  const automatic = [0, 1].filter(i => explicit[i] === undefined), remaining = budget - fixed;
  const sum = automatic.reduce((n, i) => n + frames[i], 0);
  if (sum > remaining) {
    const shares = automatic.map(i => ({i, exact: frames[i] / sum * remaining}));
    shares.forEach(s => { frames[s.i] = Math.floor(s.exact); });
    let rest = remaining - automatic.reduce((n, i) => n + frames[i], 0);
    shares.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || a.i - b.i);
    for (const s of shares) if (rest-- > 0) frames[s.i]++;
  }
  return {enterDurationInFrames: frames[0], exitDurationInFrames: frames[1]};
}
