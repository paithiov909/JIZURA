import type { RandomStream } from './types.ts';
export interface UtilityAPI {
  clamp(x: number, a?: number, b?: number): number;
  lerp(a: number, b: number, t: number): number; inv(a: number, b: number, x: number): number;
  smooth(a: number, b: number, x: number): number; TAU: number; DEG: number;
  E: Record<string, (x: number, overshoot?: number) => number>;
  sid(text: string): number;
  h(a: number, b?: number, c?: number, d?: number, e?: number): number;
  r(a: number, b?: number, c?: number, d?: number, e?: number): number;
  rs(a: number, b?: number, c?: number, d?: number, e?: number): number;
  rr(lo: number, hi: number, a: number, b?: number, c?: number, d?: number, e?: number): number;
  pick<T>(values: T[], a: number, b?: number, c?: number, d?: number): T;
  rng(seed: number): RandomStream; noise1(x: number, seed?: number): number;
  hex(input: unknown): [number, number, number]; rgba(color: string, alpha?: number): string;
  mix(a: string, b: string, amount: number): string; lum(color: string): number;
  toHex(r: number, g: number, b: number): string;
  hsl(h: number, s: number, l: number): string; toHsl(color: string): [number, number, number];
  contrast(a: string, b: string): number; fitContrast(color: string, bg: string, minimum?: number): string;
  GHOST_PAIRS: string[][];
  randomPalette(bg: string, random?: () => number): { accent: string; ghostA: string; ghostB: string; mode: string };
  isKanji(char: string): boolean; isHira(char: string): boolean; isKata(char: string): boolean;
  isSmallKana(char: string): boolean; isPunct(char: string): boolean; isLatin(char: string): boolean;
  VERT_ROTATE: string; romaji(text: string): string | null; fmtTime(time: number, fps?: number): string;
}
