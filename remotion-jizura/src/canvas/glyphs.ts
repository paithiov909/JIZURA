// Raster components and convex splitting ported from ui/services/fonts.js.
// Caches belong to one canvas; component identities are independent of calls.
import type {ResolvedFont} from '../core/style.js';
import {h, sid} from '../core/random.js';
import {rs} from '../effects/math.js';
import {fontCSS} from './fonts.js';
export type Point = [number, number];
export type Fragment = {poly: Point[]; cx: number; cy: number};
export type Piece = {id: number; cv: HTMLCanvasElement; res: number; cx: number; cy: number; w: number; h: number; area: number};
export type RasterGlyph = {ch: string; res: number; pieces: Piece[]};
export type Shard = {src: Piece; poly?: Point[]; fx: number; fy: number; cx: number; cy: number};
export const resolutionBucket = (px: number) => {let r = 64; while (r < px && r < 512) r *= 2; return r;};
export class GlyphCache {
  private map = new Map<string, {glyph: RasterGlyph; shards: Shard[]}>();
  private tint = new WeakMap<Piece, Map<string, HTMLCanvasElement>>();
  private doc: Document;
  constructor(doc: Document) {this.doc = doc;}
  get(font: ResolvedFont, ch: string, px: number, seed: number) {
    const res = resolutionBucket(px), key = JSON.stringify([font, ch, res, seed]);
    let entry = this.map.get(key);
    if (!entry) {
      const glyph = decompose(this.doc, font, ch, res), shards: Shard[] = [];
      for (const p of glyph.pieces) {
        const fr = fragments(p, seed);
        if (fr.length <= 1) shards.push({src: p, fx: 0, fy: 0, cx: p.cx, cy: p.cy});
        else for (const f of fr) shards.push({src: p, poly: f.poly, fx: f.cx, fy: f.cy, cx: p.cx + f.cx, cy: p.cy + f.cy});
      }
      entry = {glyph, shards}; this.map.set(key, entry);
      if (this.map.size > 256) this.map.delete(this.map.keys().next().value!);
    }
    return entry;
  }
  sprite(piece: Piece, color: string) {
    if (color === '#ffffff' || color === '#fff') return piece.cv;
    let colors = this.tint.get(piece); if (!colors) {colors = new Map(); this.tint.set(piece, colors);}
    let cv = colors.get(color);
    if (!cv) {cv = this.doc.createElement('canvas'); cv.width = piece.cv.width; cv.height = piece.cv.height;
      const ctx = cv.getContext('2d')!; ctx.drawImage(piece.cv, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, cv.width, cv.height); colors.set(color, cv);}
    return cv;
  }
}
function decompose(doc: Document, font: ResolvedFont, ch: string, res: number): RasterGlyph {
  const S = Math.ceil(res * 1.45), half = S / 2;
  const cv = doc.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d', { willReadFrequently: true })!;
  x.font = fontCSS(font, res); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  x.fillText(ch, half, half);
  const img = x.getImageData(0, 0, S, S).data;
  const N = S * S, A = new Uint8Array(N);
  for (let i = 0; i < N; i++) A[i] = img[i * 4 + 3];
  const L = new Int32Array(N), TH = 60;
  const stack = new Int32Array(N);
  let nl = 0; const boxes: {x0: number; y0: number; x1: number; y1: number; area: number}[] = [];
  for (let i = 0; i < N; i++) {
    if (A[i] < TH || L[i]) continue;
    nl++; let sp = 0; stack[sp++] = i; L[i] = nl;
    let x0 = S, y0 = S, x1 = 0, y1 = 0, area = 0;
    while (sp) {
      const p = stack[--sp], px = p % S, py = (p / S) | 0; area++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = py + dy; if (yy < 0 || yy >= S) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx; if (xx < 0 || xx >= S) continue;
          const q = yy * S + xx;
          if (!L[q] && A[q] >= TH) { L[q] = nl; stack[sp++] = q; }
        }
      }
    }
    boxes[nl] = { x0, y0, x1, y1, area };
  }
  // attach anti-aliased fringe pixels to neighbouring labels (two dilation passes)
  for (let pass = 0; pass < 2; pass++) {
    const L2 = L.slice();
    for (let p = 0; p < N; p++) {
      if (L[p] || !A[p]) continue;
      const px = p % S, py = (p / S) | 0;
      let lab = 0;
      if (px > 0 && L[p - 1]) lab = L[p - 1]; else if (px < S - 1 && L[p + 1]) lab = L[p + 1];
      else if (py > 0 && L[p - S]) lab = L[p - S]; else if (py < S - 1 && L[p + S]) lab = L[p + S];
      if (lab) { L2[p] = lab; const b = boxes[lab]; if (px < b.x0) b.x0 = px; if (px > b.x1) b.x1 = px; if (py < b.y0) b.y0 = py; if (py > b.y1) b.y1 = py; }
    }
    L.set(L2);
  }
  // merge specks into nearest bigger piece
  const minA = res * res * 0.0012;
  const remap = new Int32Array(nl + 1);
  for (let l = 1; l <= nl; l++) remap[l] = l;
  for (let l = 1; l <= nl; l++) {
    const b = boxes[l]; if (b.area >= minA) continue;
    let best = 0, bd = 1e9; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    for (let m = 1; m <= nl; m++) {
      if (m === l || boxes[m].area < minA) continue;
      const o = boxes[m]; const dx = Math.max(o.x0 - cx, 0, cx - o.x1), dy = Math.max(o.y0 - cy, 0, cy - o.y1);
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = m; }
    }
    if (best) { remap[l] = best; const o = boxes[best]; o.x0 = Math.min(o.x0, b.x0); o.y0 = Math.min(o.y0, b.y0); o.x1 = Math.max(o.x1, b.x1); o.y1 = Math.max(o.y1, b.y1); }
  }
  const pieces: Piece[] = [];
  for (let l = 1; l <= nl; l++) {
    if (remap[l] !== l) continue;
    const b = boxes[l]; const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const pc = doc.createElement('canvas'); pc.width = w; pc.height = h;
    const px = pc.getContext('2d')!; const id = px.createImageData(w, h); const d = id.data;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const p = (b.y0 + yy) * S + (b.x0 + xx);
      if (remap[L[p]] === l && L[p]) { const o = (yy * w + xx) * 4; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = A[p]; }
    }
    px.putImageData(id, 0, 0);
    pieces.push({
      id: 0, cv: pc, res,
      // centre & size in em units, relative to glyph centre
      cx: ((b.x0 + b.x1 + 1) / 2 - half) / res, cy: ((b.y0 + b.y1 + 1) / 2 - half) / res,
      w: w / res, h: h / res, area: b.area / (res * res),
    });
  }
  pieces.sort((a, b) => b.area - a.area);
  pieces.forEach((p, i) => {p.id = h(sid(ch), res, i + 1);});
  return { ch, res, pieces };
}

export function fragments(pc: Pick<Piece, "w" | "h" | "id">, seed: number): Fragment[] {
  const w = pc.w, h = pc.h;
  let polys: Point[][] = [[[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]];
  const cuts = Math.max(pc.w, pc.h) > 0.42 ? 2 : Math.max(pc.w, pc.h) > 0.2 ? 1 : 0;
  for (let c = 0; c < cuts; c++) {
    const next: Point[][] = [];
    for (const poly of polys) {
      const ang = (w > h ? Math.PI / 2 : 0) + rs(seed, pc.id, c) * 0.5;
      const nx = Math.cos(ang), ny = Math.sin(ang);
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const off = rs(seed, pc.id, c, 7) * 0.12 * Math.max(w, h);
      const d0 = nx * cx + ny * cy + off;
      next.push(clipHalf(poly, nx, ny, d0, 1), clipHalf(poly, nx, ny, d0, -1));
    }
    polys = next.filter(p => p.length >= 3);
  }
  return polys.map(p => {
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length;
    return { poly: p, cx, cy };
  });
}
function clipHalf(poly: Point[], nx: number, ny: number, d0: number, sgn: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = sgn * (nx * a[0] + ny * a[1] - d0), db = sgn * (nx * b[0] + ny * b[1] - d0);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
