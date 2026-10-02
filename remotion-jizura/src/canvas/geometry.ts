import type {PreparedCut, PreparedScene} from '../core/scene-plan.js';
import type {ResolvedFont} from '../core/style.js';

export type Glyph = Readonly<{
  ch: string; i: number; codePointIndex: number; li: number; ci: number; n: number;
  x: number; y: number; w: number; h: number; color: string;
}>;
export type Box = Readonly<{x0: number; y0: number; x1: number; y1: number; cx: number; cy: number}>;
export type StaticItem = Readonly<{
  text: string; font: ResolvedFont; size: number; track: number; lead: number;
  x: number; y: number; sx: number; sy: number; glyphs: readonly Glyph[];
}>;
export type CutGeometry = Readonly<{items: readonly StaticItem[]; box: Box | null; subtitle?: StaticItem}>;
export type Advance = (font: ResolvedFont, ch: string) => number;

// Horizontal, centered, typeset=false subset of engine/text.ts. Newlines count
// in emphasis coordinates but not in the reference's animation glyph index.
export function layoutGlyphs(cut: PreparedCut, size: number, track: number, advance: Advance): {glyphs: Glyph[]; width: number; height: number} {
  const lines = cut.text.split('\n').map(line => [...line]), lead = cut.style.lead * size;
  const widths = lines.map(chars => chars.reduce((sum, ch, i) => sum + advance(cut.font, ch) * size + (i < chars.length - 1 ? track * size : 0), 0));
  const glyphs: Glyph[] = [];
  let codePointIndex = 0;
  lines.forEach((chars, li) => {
    let x = -widths[li] / 2;
    chars.forEach((ch, ci) => {
      const w = advance(cut.font, ch) * size;
      const emphasized = cut.emphasis.some(range => codePointIndex >= range.start && codePointIndex < range.end);
      glyphs.push({ch, i: glyphs.length, codePointIndex: codePointIndex++, li, ci, n: chars.length,
        x: x + w / 2, y: (li - (lines.length - 1) / 2) * lead, w, h: size,
        color: emphasized ? cut.style.emphasisColor : cut.style.palette.fg});
      x += w + track * size;
    });
    codePointIndex++; // newline, including empty lines
  });
  return {glyphs, width: Math.max(1, ...widths), height: lines.length * lead - (lead - size)};
}

export function measureStaticCut(cut: PreparedCut, scene: PreparedScene, advance: Advance): CutGeometry {
  // Stage 04 baseline uses sx=sy=1 and no automatic reflow/center ornaments.
  // The center effect's complete geometry is implemented in stage 06.
  const track = cut.trackSource === 'auto' ? 0.06 : cut.layout.params.track as number;
  const probe = layoutGlyphs(cut, 100, track, advance);
  const size = Math.min(100 * Math.min(scene.width * 0.84 / Math.max(1, probe.width), scene.height * 0.5 / Math.max(1, probe.height)), scene.height * 0.33, cut.style.fontSize ?? Infinity);
  const {glyphs} = layoutGlyphs(cut, size, track, advance);
  const x = scene.width / 2, y = scene.height / 2;
  const visible = glyphs.filter(g => g.ch !== ' ' && g.ch !== '　');
  const box = visible.length ? {
    x0: x + Math.min(...visible.map(g => g.x - g.w / 2)), y0: y + Math.min(...visible.map(g => g.y - g.h / 2)),
    x1: x + Math.max(...visible.map(g => g.x + g.w / 2)), y1: y + Math.max(...visible.map(g => g.y + g.h / 2)), cx: x, cy: y,
  } : null;
  return {items: [{text: cut.text, font: cut.font, size, track, lead: cut.style.lead, x, y, sx: 1, sy: 1, glyphs}], box};
}
