// Per-glyph items from the retained mixed layout, using one resolved face.
import type {PreparedCut, PreparedScene} from '../core/scene-plan.js';
import {isKanji, isKata, isLatin, isPunct, isSmallKana} from '../core/scripts.js';
import {r, rs} from '../effects/math.js';
import {itemBox} from './center.js';
import type {Advance, CutGeometry, StaticItem} from './geometry.js';
export function measureMixedCut(cut: PreparedCut, scene: PreparedScene, advance: Advance): CutGeometry {
  const p = cut.layout.params, chars = [...cut.text].map((ch, index) => ({ch, index})).filter(c => !/\s/.test(c.ch));
  const rows = chars.length > 9 ? 2 : 1, perRow = Math.ceil(chars.length / rows), items: StaticItem[] = [];
  const metrics = chars.map(({ch, index}, i) => {
    let k = isKanji(ch) ? 1 : isKata(ch) ? 0.88 : isLatin(ch) ? 0.8 : isPunct(ch) ? 0.42 : (p.smallK as number) + r(cut.seed, i, 3) * 0.14;
    if (isSmallKana(ch)) k *= 0.8;
    return {ch, index, k, w: advance(cut.font, ch) * k * 0.96};
  });
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const row = metrics.slice(rowIndex * perRow, (rowIndex + 1) * perRow);
    const sumW = row.reduce((s, c) => s + c.w, 0);
    // Cap every actual glyph size, including smallK values above the old range.
    const base = Math.min(scene.width * 0.86 / sumW, scene.height * (rows > 1 ? 0.3 : 0.4),
      (cut.style.fontSize ?? Infinity) / Math.max(...row.map(c => c.k)));
    let x = scene.width / 2 - sumW * base / 2;
    const baseline = scene.height / 2 + base * 0.38 + (rowIndex - (rows - 1) / 2) * base * 1.05;
    row.forEach((c, j) => {
      const i = rowIndex * perRow + j, size = c.k * base;
      let y = baseline - size / 2 + rs(cut.seed, i, 5) * base * 0.06;
      if (p.mode === 'stair') y += (j - (row.length - 1) / 2) * base * 0.12;
      if (p.mode === 'wave') y += Math.sin(j * 1.1) * base * 0.1;
      const color = cut.emphasis.some(e => c.index >= e.start && c.index < e.end) ? cut.style.emphasisColor
        : i === (p.accentIdx as number) % chars.length && !isKanji(c.ch) ? cut.style.palette.accent : cut.style.palette.fg;
      items.push({text: c.ch, font: cut.font, size, x: x + c.w * base / 2, y, rot: rs(cut.seed, i, 6) * (p.rotAmp as number), index: i,
        sx: 1, sy: 1, track: 0, lead: cut.style.lead,
        glyphs: [{ch: c.ch, i: 0, codePointIndex: c.index, li: 0, ci: j, n: 1, x: 0, y: 0, w: advance(cut.font, c.ch) * size, h: size, color}]});
      x += c.w * base;
    });
  }
  const boxes = items.flatMap(it => {const b = itemBox(it); return b ? [b] : [];});
  const box = boxes.length ? {x0: Math.min(...boxes.map(b => b.x0)), x1: Math.max(...boxes.map(b => b.x1)),
    y0: Math.min(...boxes.map(b => b.y0)), y1: Math.max(...boxes.map(b => b.y1)), cx: 0, cy: 0} : null;
  if (box) {box.cx = (box.x0 + box.x1) / 2; box.cy = (box.y0 + box.y1) / 2;}
  return {items, box};
}
