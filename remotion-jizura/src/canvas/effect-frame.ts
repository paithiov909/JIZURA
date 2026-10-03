import {applyCustomMotions, frameContext} from './custom-frame.js';
import {customRuntime} from '../effects/custom.js';
import type {CanvasFrame, FrameItem} from './frame.js';
import type {ScenePlan, PreparedCut} from '../core/scene-plan.js';
import {layoutGlyphs, type Box, type CutGeometry} from './geometry.js';
import {fontCSS} from './fonts.js';
import {GlyphCache} from './glyphs.js';
import {applyMotion, driftPiece, PID, type ItemMotion} from '../effects/motion.js';
import {drawCheckerStrip, drawKasumi, drawBrackets, type DecorBag, type DecorEnv} from '../effects/decor.js';
import {fail} from '../core/validation.js';
import {E, DEG, lerp} from '../effects/math.js';

const caches = new WeakMap<HTMLCanvasElement, GlyphCache>();
export function clearEffectCache(canvas: HTMLCanvasElement): void {caches.delete(canvas);}
function cacheFor(canvas: HTMLCanvasElement) {
  let cache = caches.get(canvas); if (!cache) {cache = new GlyphCache(canvas.ownerDocument); caches.set(canvas, cache);} return cache;
}
// Re-layout breathe from immutable per-glyph advances, preserving reflow colors.
function remeasure(item: FrameItem, base: FrameItem, prepared: PreparedCut): void {
  const widths = new Map(base.glyphs.map(g => [g.ch, g.w / base.size]));
  const cut = {...prepared, text: item.text, font: item.font};
  const laid = layoutGlyphs(cut, item.size, item.track, (_, ch) => widths.get(ch)!);
  item.glyphs = laid.glyphs.map((g, i) => ({...g, codePointIndex: base.glyphs[i].codePointIndex, color: base.glyphs[i].color}));
}
export function prepareEffectItems(work: CanvasFrame, scene?: ScenePlan<CutGeometry>['prepared']): ItemMotion[] {
  if (!work.cut) return [];
  const motions = work.items.map(item => {
    const base = {...item, glyphs: item.glyphs};
    const motion = applyMotion(item, work.cut!.prepared, work.state);
    if (base.size !== item.size || base.track !== item.track) remeasure(item, base, work.cut!.prepared);
    return motion;
  });
  if (scene) applyCustomMotions(scene, work, motions);
  // Reference drawItem's logical bbox ignores glyph rotation/clip/shard motion.
  // pop scale/hide and breathe geometry are included; no previous-frame state.
  const boxes = work.items.flatMap((item, index) => item.size <= 0.5 ? [] : item.glyphs.flatMap((g, i) => {
    const c = motions[index].chars[i]; if (c?.hide || c?.a === 0 || g.ch === ' ' || g.ch === '　') return [];
    const s = c?.s ?? 1; return [{x0: item.x + (c?.dx ?? 0) + (g.x - g.w * s / 2) * item.sx, x1: item.x + (c?.dx ?? 0) + (g.x + g.w * s / 2) * item.sx,
      y0: item.y + (c?.dy ?? 0) + (g.y - g.h * s / 2) * item.sy, y1: item.y + (c?.dy ?? 0) + (g.y + g.h * s / 2) * item.sy, cx: item.x, cy: item.y}];
  }));
  work.box = boxes.length ? {x0: Math.min(...boxes.map(b => b.x0)), x1: Math.max(...boxes.map(b => b.x1)), y0: Math.min(...boxes.map(b => b.y0)), y1: Math.max(...boxes.map(b => b.y1)), cx: work.cut.prepared.layout.id === 'mixed' ? (Math.min(...boxes.map(b => b.x0)) + Math.max(...boxes.map(b => b.x1))) / 2 : boxes[0].cx, cy: work.cut.prepared.layout.id === 'mixed' ? (Math.min(...boxes.map(b => b.y0)) + Math.max(...boxes.map(b => b.y1))) / 2 : boxes[0].cy} : null;
  return motions;
}
function drawItem(canvas: HTMLCanvasElement, item: FrameItem, motion: ItemMotion, work: CanvasFrame): void {
  if (item.size <= 0.5) return;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  try {
    if (motion.clip) {ctx.beginPath(); ctx.rect(motion.clip[0], -canvas.height, motion.clip[1] - motion.clip[0], canvas.height * 3); ctx.clip();}
    ctx.translate(item.x, item.y); if (item.rot) ctx.rotate(item.rot * DEG); ctx.font = fontCSS(item.font, item.size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const g of item.glyphs) {
      const c = motion.chars[g.i]; if (c?.hide || c?.a === 0 || g.ch === ' ' || g.ch === '　') continue;
      const gx = g.x * item.sx + (c?.dx ?? 0), gy = g.y * item.sy + (c?.dy ?? 0), rot = c?.rot ?? 0, sx = item.sx * (c?.s ?? 1), sy = item.sy * (c?.s ?? 1);
      let moving = false;
      if (motion.driftSeed !== undefined) {
        const cache = cacheFor(canvas), {glyph, shards} = cache.get(item.font, g.ch, item.size * Math.max(item.sx, item.sy) * (c?.s ?? 1), motion.driftSeed);
        const elapsed = work.state.pOut * work.state.exitSeconds;
        const transforms = shards.map((_, j) => driftPiece(motion.driftSeed!, g.i, j, item.size, elapsed, work.state.exitSeconds));
        moving = transforms.some(t => t !== PID);
        if (shards.length && moving) shards.forEach((p, j) => {
          const t = transforms[j]; if (!t || t.a <= 0.003) return;
          const cr = Math.cos(rot * DEG), sr = Math.sin(rot * DEG), ex = p.cx * item.size * sx, ey = p.cy * item.size * sy;
          const spr = cache.sprite(p.src, g.color), res = glyph.res;
          ctx.save(); ctx.translate(gx + ex * cr - ey * sr + t.dx, gy + ex * sr + ey * cr + t.dy);
          if (t.st !== 1) {const d = t.sdir * DEG; ctx.rotate(d); ctx.scale(t.st, 1 / Math.sqrt(t.st)); ctx.rotate(-d);}
          ctx.rotate((rot + t.rot) * DEG); const k = item.size / res * t.s; ctx.scale(sx * k, sy * k); ctx.globalAlpha = t.a * (c?.a ?? 1);
          if (p.poly) {ctx.beginPath(); p.poly.forEach((q, i) => {const x = (q[0] - p.fx) * res, y = (q[1] - p.fy) * res; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);}); ctx.closePath(); ctx.clip(); ctx.drawImage(spr, -p.fx * res - p.src.w * res / 2, -p.fy * res - p.src.h * res / 2);}
          else ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
          ctx.restore();
        });
        if (!shards.length) moving = false;
      }
      if (moving) continue;
      ctx.save(); ctx.translate(gx, gy); if (rot) ctx.rotate(rot * DEG); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      ctx.globalAlpha = c?.a ?? 1; ctx.fillStyle = g.color; ctx.fillText(g.ch, 0, 0); ctx.restore();
    }
  } finally {ctx.restore();}
  if (motion.bar) {ctx.save(); ctx.fillStyle = work.cut!.prepared.style.palette.accent; ctx.fillRect(motion.bar.x - Math.max(4, item.size * 0.035), item.y - motion.bar.h / 2, Math.max(8, item.size * 0.07), motion.bar.h); ctx.restore();}
}
export function drawEffects(canvas: HTMLCanvasElement, plan: ScenePlan<CutGeometry>, work: CanvasFrame): void {
  const cut = work.cut!.prepared, motions = prepareEffectItems(work, plan.prepared), ctx = canvas.getContext('2d')!;
  const fallback: Box = work.cut!.geometry.box ?? {x0: canvas.width * 0.35, x1: canvas.width * 0.65, y0: canvas.height * 0.4, y1: canvas.height * 0.6, cx: canvas.width / 2, cy: canvas.height / 2};
  const bb = work.box ?? fallback;
  const env: DecorEnv = {ctx, W: canvas.width, H: canvas.height, sc: cut.style.palette, lt: work.state.evaluationSeconds!, ltb: work.state.evaluationSeconds!, pOut: work.state.pOut, pass: 'main'};
  const decor = (layer: 'back' | 'front') => {
    for (const effect of cut.decor) if (effect.layer === layer) {
      const p = {...effect.params, seed: effect.seed} as DecorBag;
      ctx.save(); try {const custom = customRuntime(effect);
        if (custom?.draw) {
          const result = custom.draw(Object.freeze({...frameContext(plan.prepared, work, effect), ctx, box: work.box ? Object.freeze({...work.box}) : null}));
          if (result !== undefined) fail('E_EFFECT', `decor.${effect.id}.draw`, 'Custom decor draw must return void synchronously.');
        } else if (effect.id === 'kasumi') drawKasumi(env, bb, p); else if (effect.id === 'checkerStrip') drawCheckerStrip(env, bb, p); else if (effect.id === 'brackets') drawBrackets(env, work.box, p);} finally {ctx.restore();}
    }
  };
  decor('back');
  work.items.forEach((item, i) => drawItem(canvas, item, motions[i], work));
  const item = work.items[0], p = cut.layout.params;
  if (cut.layout.id === 'center' && cut.layout.customKey === undefined && work.box && item) {
    if (p.sub && cut.lineText !== cut.text) {
      const sub = work.cut!.geometry.subtitle!;
      ctx.save(); ctx.globalAlpha = E.outCubic(work.state.pIn); ctx.font = fontCSS(sub.font, sub.size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cut.style.palette.sub;
      for (const g of sub.glyphs) ctx.fillText(g.ch, sub.x + g.x, work.box.y1 + plan.prepared.height * 0.07 + g.y); ctx.restore();
    }
    if (p.under) {
      const e = E.outExpo(work.state.pIn * 1.2 - 0.2), o = E.inCubic(work.state.pOut);
      if (e > 0 && o < 1) {ctx.save(); ctx.strokeStyle = cut.style.palette.accent; ctx.lineWidth = Math.max(2, work.cut!.geometry.items[0].size * 0.03); ctx.beginPath();
        const y = work.box.y1 + work.cut!.geometry.items[0].size * 0.14;
        ctx.moveTo(lerp(work.box.x0, work.box.x1, o), y); ctx.lineTo(lerp(work.box.x0, work.box.x1, e), y); ctx.stroke(); ctx.restore();}
    }
  }
  decor('front');
}
