import {drawEmptyFrame} from './empty-frame.js';
import {fontCSS} from './fonts.js';
import type {CutGeometry} from './geometry.js';
import type {ScenePlan} from '../core/scene-plan.js';

export function drawStaticFrame(canvas: HTMLCanvasElement, plan: ScenePlan<CutGeometry>, active: boolean): void {
  drawEmptyFrame(canvas, plan.prepared.background, active);
  if (!active) return;
  const ctx = canvas.getContext('2d')!;
  // Stage 04 preview: first planned Cut, without time selection or effects.
  const geometry = plan.cuts[0]?.geometry;
  for (const item of geometry?.items ?? []) {
    ctx.save();
    try {
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.translate(item.x, item.y);
      ctx.font = fontCSS(item.font, item.size);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const glyph of item.glyphs) {
        if (glyph.ch === ' ' || glyph.ch === '　') continue;
        ctx.save();
        try {
          ctx.translate(glyph.x, glyph.y);
          ctx.fillStyle = glyph.color;
          ctx.fillText(glyph.ch, 0, 0);
        } finally { ctx.restore(); }
      }
    } finally { ctx.restore(); }
  }
}
