// checkerStrip/kasumi/brackets and their drawing dependencies.
import type {Box} from '../canvas/geometry.js';
import type {ResolvedStyle} from '../core/style.js';
import {E, clamp, r, contrast, lum, lerp} from './math.js';
type Point = [number, number];
export type DecorBag = {seed: number; n: number; v: number; right: boolean; low: boolean; accent: boolean; pad?: number; stroke?: number};
export type DecorEnv = {W: number; H: number; sc: ResolvedStyle['palette']; ctx: CanvasRenderingContext2D; lt: number; ltb: number; pOut: number; pass: 'main'};
const U = (env: DecorEnv) => Math.min(env.W, env.H) / 1080;
const MG = (env: DecorEnv) => Math.round(Math.min(env.W, env.H) * 0.05);
const outE = (env: DecorEnv) => 1 - E.inCubic(env.pOut);
const dark = (env: DecorEnv) => lum(env.sc.bg) < 0.5;
const ACC = (env: DecorEnv) => contrast(env.sc.accent, env.sc.bg) >= 1.5 ? env.sc.accent : env.sc.fg;
// Stateless clamp: caller chooses current-frame box or immutable static fallback.
const getBB = (env: DecorEnv, bb: Box): Box => {
  const x0 = Math.max(bb.x0, -env.W * 0.1), x1 = Math.min(bb.x1, env.W * 1.1);
  const y0 = Math.max(bb.y0, -env.H * 0.1), y1 = Math.min(bb.y1, env.H * 1.1);
  return {...bb, x0: x1 > x0 ? x0 : bb.x0, x1: x1 > x0 ? x1 : bb.x1, y0: y1 > y0 ? y0 : bb.y0, y1: y1 > y0 ? y1 : bb.y1};
};
const hitBB = (x0: number, y0: number, x1: number, y1: number, bb: Box, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
function cornerSpot(env: DecorEnv, bb: Box, w: number, h: number, P: DecorBag, mk = 1) {
  const { W, H } = env, m = MG(env) * mk;
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  const order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]];
  let best: {x: number; y: number; cx: number; cy: number; ok: boolean; sx: number; sy: number} | null = null, bestA = 1e18;
  for (const [sx, sy] of order) {
    const X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
    if (!hitBB(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx, sy };
    const ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
    if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx, sy }; }
  }
  return best!;
}

function stroke(env: DecorEnv, pts: Point[], c: string, lw: number, a = 1) {
  if (a <= 0.003 || pts.length < 2) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw;
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]); ctx.stroke(); ctx.globalAlpha = 1;
}
function segs(env: DecorEnv, list: number[][], c: string, lw: number, a = 1) {
  if (a <= 0.003 || !list.length) return; const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath();
  for (const s of list) {ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]);} ctx.stroke(); ctx.globalAlpha = 1;
}
function rects(env: DecorEnv, list: number[][], c: string, a = 1) {
  if (a <= 0.003 || !list.length) return; const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath();
  for (const r of list) if (r[2] > 0 && r[3] > 0) ctx.rect(r[0], r[1], r[2], r[3]); ctx.fill(); ctx.globalAlpha = 1;
}
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function part(pts: Point[], e0: number, e1: number): Point[] {
  e0 = clamp(e0); e1 = clamp(e1);
  if (e1 <= e0 || pts.length < 2) return [];
  const d: number[] = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1]; if (L <= 0) return [];
  const A = e0 * L, B = e1 * L;
  const at = (s: number): Point => { let i = 1; while (i < d.length - 1 && d[i] < s) i++; const k = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * clamp(k), pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * clamp(k)]; };
  const out: Point[] = [at(A)];
  for (let i = 1; i < pts.length - 1; i++) if (d[i] > A && d[i] < B) out.push(pts[i]);
  out.push(at(B));
  return out;
}
export function drawCheckerStrip(env: DecorEnv, bb0: Box, P: DecorBag) {
  if (env.pass !== 'main') return;
  const bb = getBB(env, bb0), { W, sc } = env, u = U(env);
  const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
  const v = (P.v | 0) % 3, rows = v === 1 ? 3 : v === 2 ? 1 : 2;
  const c = clamp(Math.min(W, env.H) * 0.016, 10 * u, 18 * u), L = Math.min(W * 0.32, 400 * u), h = rows * c;
  const sp = cornerSpot(env, bb, L, h + (v === 2 ? 10 * u : 0), P, 1);
  const a = o * (sp.ok ? 1 : 0.35), x0 = sp.x, y0 = sp.y + (v === 2 ? 5 * u : 0);
  const e = E.outExpo(clamp(env.lt / 0.55)), vis = L * e, off = (env.ltb * c * 1.6 * (P.right ? -1 : 1)) % (2 * c);
  const list: number[][] = [];
  for (let j = 0; j < rows; j++) for (let i = -2; i * c < L + 2 * c; i++) {
    if ((i + j) % 2 !== 0) continue;
    let x = x0 + i * c + off, w = c;
    const k = v === 1 ? clamp(1 - (i * c) / L * 0.95) : 1;
    const cw = w * k, ch = c * k, cx0 = x + (w - cw) / 2;
    const xa = Math.max(cx0, x0), xb = Math.min(cx0 + cw, x0 + vis);
    if (xb <= xa) continue;
    list.push([xa, y0 + j * c + (c - ch) / 2, xb - xa, ch]);
  }
  rects(env, list, P.accent ? sc.accent : sc.fg, 0.9 * a);
  if (v === 2) { const lw = Math.max(1, u); segs(env, [[x0, y0 - 5 * u, x0 + vis, y0 - 5 * u], [x0, y0 + h + 5 * u, x0 + vis, y0 + h + 5 * u]], sc.fg, lw, 0.8 * a); }
}
export function drawKasumi(env: DecorEnv, bb: Box, P: DecorBag) {
  if (env.pass !== 'main' || env.lt < 0) return;
  const { W, H, sc, ctx } = env, u = U(env);
  const o = outE(env); if (o <= 0.003) return;
  const n = 2 + ((P.n | 0) % 2), hb = clamp(Math.min(W, H) * 0.046, 28 * u, 58 * u);
  const fill = sc.dim, line = ACC(env), dk = dark(env);
  const fa = (dk ? 0.9 : 0.75) * o;
  for (let k = 0; k < n; k++) {
    const random = (i: number) => r(P.seed, k, i);
    const dir = (k + (P.right ? 1 : 0)) % 2 ? 1 : -1;
    const e = E.outCubic(clamp((env.lt - k * 0.12) / 0.8));
    const Lm = W * (0.34 + random(1) * 0.22), yc = H * ((k + 0.5) / n) + (random(2) - 0.5) * H * 0.16;
    const xc = W * (0.5 + dir * (0.2 + random(3) * 0.18)) + dir * (1 - e) * W * 0.25 + dir * env.ltb * 7 * u;
    const Lu = Lm * (0.45 + random(4) * 0.2), xu = xc + (random(5) < 0.5 ? -1 : 1) * Lm * 0.22, hu = hb * 0.8;
    const Ld = Lm * (0.3 + random(6) * 0.2), xd = xc - (xu - xc) * 0.8;
    ctx.save(); ctx.globalAlpha = fa * e; ctx.fillStyle = fill; ctx.beginPath();
    rrPath(ctx, xc - Lm / 2, yc - hb / 2, Lm, hb, hb / 2);
    rrPath(ctx, xu - Lu / 2, yc - hb / 2 - hu + 1, Lu, hu + 2, hu / 2);
    if (random(7) < 0.6) rrPath(ctx, xd - Ld / 2, yc + hb / 2 - 1, Ld, hu * 0.85 + 2, hu * 0.42);
    ctx.fill(); ctx.restore();
    const lw = Math.max(1, 1.2 * u), la = 0.75 * o * e;
    const tl: Point[] = [[xu - Lu / 2 + hu / 2, yc - hb / 2 - hu + 1], [xu + Lu / 2 - hu / 2, yc - hb / 2 - hu + 1]];
    stroke(env, part(tl, 0, E.inOutCubic(clamp((env.lt - 0.3 - k * 0.12) / 0.6))), line, lw, la);
    stroke(env, part([[xc + Lm / 2 - hb / 2, yc + hb / 2], [xc - Lm / 2 + hb / 2, yc + hb / 2]], 0, E.inOutCubic(clamp((env.lt - 0.4 - k * 0.12) / 0.6))), line, lw, la * 0.7);
  }
}

// The new brackets uses the current box, or the original central fallback on null.
// No frame-history cache or static-geometry fallback is used by this effect.
export function bracketGeometry(env: Pick<DecorEnv, 'W' | 'H' | 'lt' | 'pOut'>, box: Box | null, padBase: number) {
  const bb = box ?? {x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6};
  const e = E.outExpo(clamp(env.lt / 0.35)) * (1 - E.inCubic(env.pOut));
  const pad = padBase + (bb.y1 - bb.y0) * 0.12;
  const x0 = bb.x0 - pad, x1 = bb.x1 + pad, y0 = bb.y0 - pad, y1 = bb.y1 + pad;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, L = Math.min(x1 - x0, y1 - y0) * 0.16 + 8;
  const X0 = lerp(cx, x0, e), X1 = lerp(cx, x1, e), Y0 = lerp(cy, y0, e), Y1 = lerp(cy, y1, e);
  return {e, pad, L, corners: [[[X0, Y0 + L], [X0, Y0], [X0 + L, Y0]], [[X1 - L, Y0], [X1, Y0], [X1, Y0 + L]],
    [[X0, Y1 - L], [X0, Y1], [X0 + L, Y1]], [[X1 - L, Y1], [X1, Y1], [X1, Y1 - L]]]};
}
export function drawBrackets(env: DecorEnv, box: Box | null, p: DecorBag): void {
  const geo = bracketGeometry(env, box, p.pad as number); if (geo.e <= 0) return;
  const ctx = env.ctx; ctx.strokeStyle = p.accent ? env.sc.accent : env.sc.fg; ctx.lineWidth = p.stroke as number;
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  for (const points of geo.corners) {ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (const [x, y] of points.slice(1)) ctx.lineTo(x, y); ctx.stroke();}
}
