// Ported from engine/util.ts: numeric hash, UTF-16 FNV-1a and mulberry32.
// Streams are local to planning; no frame, history, key or mount order enters them.
export function sid(s: string): number {
  let v = 2166136261;
  for (let i = 0; i < s.length; i++) { v ^= s.charCodeAt(i); v = Math.imul(v, 16777619); }
  return v >>> 0;
}
export function h(a: number, b = 0, c = 0, d = 0, e = 0): number {
  let v = 0x9e3779b9 ^ (a | 0);
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b);
  v = (v + Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)) | 0;
  v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35);
  v = (v + Math.imul((c | 0) + 0x5bd1e995, 0x27d4eb2f)) | 0;
  v = Math.imul(v ^ (v >>> 15), 0x165667b1);
  v = (v + Math.imul((d | 0) + 0x1b873593, 0x85ebca6b)) | 0;
  v = Math.imul(v ^ (v >>> 16), 0x27d4eb2f);
  v = (v + Math.imul((e | 0) + 0x68e31da4, 0x9e3779b1)) | 0;
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12;
  v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return v >>> 0;
}
export function rng(seed: number) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6d2b79f5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(f, {
    range: (lo: number, hi: number) => lo + (hi - lo) * f(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * f()),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(f() * arr.length) % arr.length],
    chance: (p: number) => f() < p,
  });
}
export const cutSeed = (sceneSeed: number, index: number) => h(sceneSeed, index + 1, sid('cut'));
export const selectionSeed = (cut: number, group: string) => h(cut, sid(group), sid('select'));
export const effectSeed = (cut: number, group: string, id: string, slot: number) => h(cut, sid(group), sid(id), slot + 1);
export const parameterSeed = (effect: number) => h(effect, sid('params'));
export const itemSeed = (effect: number, index: number) => h(effect, index + 1, 7);
