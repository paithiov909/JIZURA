import type {PreparedCut, PreparedScene} from '../core/scene-plan.js';
import type {Advance, CutGeometry} from './geometry.js';
import {layoutGlyphs} from './geometry.js';
import {customRuntime, customRandom} from '../effects/custom.js';
import {fail, finite, freeze, keys, record} from '../core/validation.js';

export function measureCustomCut(cut: PreparedCut, scene: PreparedScene, advance: Advance): CutGeometry {
  const runtime = customRuntime(cut.layout)!;
  const trackValue = (v: unknown) => finite(v ?? cut.style.track ?? 0.06, 'layout.track', 0, 1, 'E_EFFECT');
  const measureText = ({size, track}: {size: number; track?: number}) => {
    finite(size, 'layout.size', Number.MIN_VALUE, Infinity, 'E_EFFECT');
    const {width, height} = layoutGlyphs(cut, size, trackValue(track), advance); return {width, height};
  };
  const placements = runtime.layout!(Object.freeze({width: scene.width, height: scene.height, text: cut.text, emphasis: cut.emphasis,
    font: cut.font, style: cut.style, seed: cut.layout.seed, params: cut.layout.params,
    random: customRandom(cut.layout.seed), measureText,
    fitText: ({maxWidth, maxHeight, maxSize, track}) => {
      finite(maxWidth, 'layout.maxWidth', Number.MIN_VALUE, Infinity, 'E_EFFECT');
      finite(maxHeight, 'layout.maxHeight', Number.MIN_VALUE, Infinity, 'E_EFFECT');
      if (maxSize !== undefined) finite(maxSize, 'layout.maxSize', Number.MIN_VALUE, Infinity, 'E_EFFECT');
      const probe = measureText({size: 100, track});
      return Math.min(100 * maxWidth / probe.width, 100 * maxHeight / probe.height, maxSize ?? Infinity, cut.style.fontSize ?? Infinity);
    }}));
  if (!Array.isArray(placements) || placements.length < 1 || placements.length > 64) fail('E_EFFECT', 'layout.items', 'Return 1..64 text placements.');
  const items = placements.map((placement, i) => {
    const path = `layout.items[${i}]`, p = record(placement, path, 'E_EFFECT');
    keys(p, ['x', 'y', 'size', 'track', 'sx', 'sy'], path, 'E_EFFECT');
    const x = finite(p.x, `${path}.x`, -Infinity, Infinity, 'E_EFFECT'), y = finite(p.y, `${path}.y`, -Infinity, Infinity, 'E_EFFECT');
    const size = finite(p.size, `${path}.size`, Number.MIN_VALUE, Infinity, 'E_EFFECT'), track = trackValue(p.track);
    const sx = finite(p.sx ?? 1, `${path}.sx`, Number.MIN_VALUE, Infinity, 'E_EFFECT'), sy = finite(p.sy ?? 1, `${path}.sy`, Number.MIN_VALUE, Infinity, 'E_EFFECT');
    return {text: cut.text, font: cut.font, size, track, lead: cut.style.lead, x, y, sx, sy, glyphs: layoutGlyphs(cut, size, track, advance).glyphs};
  });
  const boxes = items.flatMap(item => item.glyphs.filter(g => g.ch !== ' ' && g.ch !== '　').map(g => ({
    x0: item.x + (g.x - g.w / 2) * item.sx, x1: item.x + (g.x + g.w / 2) * item.sx,
    y0: item.y + (g.y - g.h / 2) * item.sy, y1: item.y + (g.y + g.h / 2) * item.sy})));
  const box = boxes.length ? {x0: Math.min(...boxes.map(b => b.x0)), x1: Math.max(...boxes.map(b => b.x1)),
    y0: Math.min(...boxes.map(b => b.y0)), y1: Math.max(...boxes.map(b => b.y1)), cx: items[0].x, cy: items[0].y} : null;
  return freeze({items, box});
}
