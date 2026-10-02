// Formula subset ported from engine/util.ts, without mutable runtime state.
import {h} from '../core/random.js';
export const TAU = Math.PI * 2, DEG = Math.PI / 180;
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const r = (a: number, b = 0, c = 0, d = 0, e = 0) => h(a, b, c, d, e) / 4294967296;
export const rs = (a: number, b = 0, c = 0, d = 0, e = 0) => r(a, b, c, d, e) * 2 - 1;
export const E = {
  inQuad: (x: number) => {x = clamp(x); return x * x;},
  inCubic: (x: number) => {x = clamp(x); return x * x * x;},
  outCubic: (x: number) => 1 - Math.pow(1 - clamp(x), 3),
  inOutCubic: (x: number) => {x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;},
  outExpo: (x: number) => {x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);},
  inOutExpo: (x: number) => {x = clamp(x); if (x <= 0 || x >= 1) return x; return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;},
  outBack: (x: number, s = 1.9) => {x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);},
};
const hex = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
export const lum = (s: string) => {const [r, g, b] = hex(s); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;};
const luminance = (s: string) => hex(s).map(c => {const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);}).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a: string, b: string) => {const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);};
